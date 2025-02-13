import {
  DataAreaSettings,
  DataControl,
  getEntityValueList
} from '../common-ui-elements/interfaces'
import { BackendMethod, Controller, getFields, remult } from 'remult'
import { BasketType } from '../families/BasketType'
import { Families } from '../families/families'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'
import { getSettings } from '../manage/ApplicationSettings'
import { Field } from '../translate'

@Controller('family-self-order')
export class FamilySelfOrderController {
  constructor() {}
  @Field()
  familyUrl: string = ''

  @Field()
  familyName: string = ''

  @Field({ caption: 'סוג מזון' })
  @DataControl({
    valueList: async () => getEntityValueList(remult.repo(BasketType))
  })
  basket: string

  @DataControl({
    valueList: [
      { id: '', caption: 'ללא' },
      ...['NB', '1', '2', '3', '4', '4+', '5', '6'].map((item) => ({
        id: 'טיטולים ' + item,
        caption: item
      }))
    ]
  })
  @Field({ caption: 'מידת טיטולים' })
  titulim: string = ''

  @DataControl({
    valueList: [
      { id: '', caption: 'ללא' },
      ...['0-3', '3-6', '6-9', '9-12', '12-18', '18-24'].map((item) => ({
        id: 'בגד ' + item,
        caption: item
      }))
    ]
  })
  @Field({ caption: 'מידת בגד' })
  size: string = ''

  @Field({ caption: 'גרבר' })
  gerber: boolean

  @Field({ caption: 'דייסה' })
  daisa: boolean

  @Field({ caption: 'הערה' })
  comment: string

  @Field()
  message: string = ''

  get $() {
    return getFields(this)
  }
  area = new DataAreaSettings({
    fields: () => [
      this.$.basket,
      this.$.titulim,
      this.$.size,
      this.$.gerber,
      this.$.daisa,
      this.$.comment
    ]
  })

  @BackendMethod({
    allowed: (remult, self) => getSettings().familySelfOrderEnabled
  })
  async load() {
    let f = await this.loadFamily()
    if (!f) return
    this.familyName = f.name
  }
  @BackendMethod({
    allowed: (remult, self) => getSettings().familySelfOrderEnabled
  })
  async update() {
    let f = await this.loadFamily()
    if (!f) return
    let fd = f.createDelivery(undefined)
    fd.basketType = await remult.repo(BasketType).findId(this.basket)
    fd.items = ''
    fd.deliveryComments = this.comment
    for (const what of [
      this.titulim,
      this.size,
      this.gerber ? 'גרבר' : '',
      this.daisa ? 'דיסה' : ''
    ]) {
      if (what) {
        if (fd.items.length > 0) fd.items += ', '
        fd.items += what
      }
    }
    await fd.save()
    this.message = 'המשלוח עודכן, יום מקסים'
  }

  async loadFamily() {
    let f = await Families.getFamilyByShortUrl(this.familyUrl)
    if (!f) {
      this.message = 'לא נמצא'
      return
    }
    if (await remult.repo(ActiveFamilyDeliveries).count({ family: f.id })) {
      this.message = 'המשלוח כבר מעודכן במערכת, לשינוי נא ליצור קשר טלפוני'
      return
    }
    return f
  }
}
