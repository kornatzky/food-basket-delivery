import { Component, OnInit, Injectable } from '@angular/core';
import { PhoneColumn, required, isPhoneValidForIsrael } from '../model-shared/types';
import { StringColumn, NumberColumn, BoolColumn, DataAreaSettings, ServerFunction, Context, Column, ValueListColumn, ColumnOptions, ServerController } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { Sites } from '../sites/sites';
import { Families } from '../families/families';
import { allCentersToken } from '../manage/distribution-centers';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { EmailSvc } from '../shared/utils';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { ActivatedRoute } from '@angular/router';
import { ServerMethod } from '@remult/core';

declare var gtag;
declare var fbq;

@Component({
  selector: 'app-register-donor',
  templateUrl: './register-donor.component.html',
  styleUrls: ['./register-donor.component.scss']
})
export class RegisterDonorComponent implements OnInit {
  static MinQuantity = 10;

  constructor(private dialog: DialogService, private context: Context, private settings: ApplicationSettings, public activeRoute: ActivatedRoute) { }

  showCCMessage(): boolean {
    if (this.activeRoute.routeConfig.data && this.activeRoute.routeConfig.data.isCC)
      return true
    else return false;
  }

  refer: string = null;
  isDone = false;
  donor = new donorForm(this.context);
  area = new DataAreaSettings({
    columnSettings: () =>
      [
        [this.donor.computer, this.donor.computerAge],
        [this.donor.laptop, this.donor.laptopAge],
        this.donor.screen,
        this.donor.donationType, this.donor.phone, this.donor.email
      ]
  });
  ngOnInit() {
    let urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('refer')) {
      this.refer = urlParams.get('refer');
      this.donor.docref.value = this.refer;
    } else {
      this.donor.docref.value = document.referrer;
    }
  }

  allowSubmit() {
    return this.hasQuantity() && this.hasMandatoryFields() && !this.isDone;
  }

  hasMandatoryFields() {
    return (this.donor.name.value != null) && (isPhoneValidForIsrael(this.donor.phone.value)
      && ((this.donor.selfDeliver.value) || (this.donor.address.value != null))
    );
  }
  hasQuantity() {
    return +this.donor.laptop.value > 0 || +this.donor.computer.value > 0 || +this.donor.screen.value > 0;
  }
  
  hasEnough() {
    let total = (this.donor.laptop.value != undefined ? (this.donor.laptop.value) : 0) +
                (this.donor.computer.value != undefined ? (this.donor.computer.value) : 0) +
                (this.donor.screen.value != undefined ? (this.donor.screen.value) : 0);
    return this.donor.selfDeliver.value || total >= RegisterDonorComponent.MinQuantity;
  }
  
  async submit() {

    if (!this.hasQuantity()) {
      this.dialog.Error("אנא הזן מספר מחשבים, לפטופים או מסכים");
      return;
    }
    if (!this.hasMandatoryFields()) {
      this.dialog.Error("יש למלא שדות חובה");
      return;
    }
    if (!this.hasEnough()) {
      this.dialog.Error("לצערינו לא נוכל לאסוף תרומות עם פחות מ-" + RegisterDonorComponent.MinQuantity + " פריטים. נשמח אם תביאו את הציוד אל אחת מנקודות האיסוף שלנו");
      return;
    }
    try {
      await this.donor.createDonor();

      this.isDone = true;
      try {
        this.dialog.analytics("submitDonorForm");
        gtag('event', 'conversion', { 'send_to': 'AW-452581833/GgaBCLbpje8BEMmz59cB' });
        if (fbq) fbq('track', 'Lead');
      }
      catch (err) {
        console.log("problem with tags: ", err)
      }
    }
    catch (err) {
      this.dialog.exception("donor form", err);
    }

    await this.context.openDialog(YesNoQuestionComponent, x => x.args = {
      question: this.settings.lang.thankYouForDonation,
      showOnlyConfirm: true
    });

    if (this.refer) return;
    if (this.donor.docref.value != '') window.location.href = this.donor.docref.value
    else window.location.href = "https://www.mitchashvim.org.il/";
  }

}

export class EquipmentAge {
  static OldEq = new EquipmentAge(1, '5 שנים או יותר', false);
  static NewEq = new EquipmentAge(0, 'פחות מ 5 שנים', true);
  constructor(public id: number, public caption: string, public isNew: boolean) {
  }

}
export class EquipmentAgeColumn extends ValueListColumn<EquipmentAge>{
  constructor(caption: ColumnOptions<EquipmentAge>) {
    super(EquipmentAge, Column.consolidateOptions({
      dataControlSettings: () => ({
        width: '100'
      })
    }, caption));
  }
}
@ServerController({
  allowed: true,
  key: 'register-donor'
})
class donorForm {
  constructor(private context: Context) {

  }
  name = new StringColumn({
    caption: "שם מלא", validate: () => {
      required(this.name);

    }
  });
  phone = new StringColumn({
    caption: "טלפון",
    dataControlSettings: () => ({ inputType: 'tel' }),
    validate: () => {
      required(this.phone);
      PhoneColumn.validatePhone(this.phone, this.context);
    }
  });
  email = new StringColumn({
    caption: "דואל",
    dataControlSettings: () => ({ inputType: 'email' })
  });

  selfDeliver = new BoolColumn("אגיע עצמאית לנקודת האיסוף");
  address = new StringColumn({
    caption: "כתובת",
    validate: () => {
      if (!this.selfDeliver.value)
        required(this.address);
    }
  });

  computer = new NumberColumn("מספר מחשבים נייחים");
  computerAge = new EquipmentAgeColumn("גיל המחשב החדש ביותר");
  laptop = new NumberColumn("מספר לפטופים");
  laptopAge = new EquipmentAgeColumn("גיל הלפטופ החדש ביותר");
  screen = new NumberColumn("מספר מסכים");
  donationType = new StringColumn("סוג תרומה", {
    dataControlSettings: () => ({
      valueList: [
//        { id: 'ac52f4b0-6896-4ae3-8cc0-18ed17136e38', caption: 'תרומה פרטית' },
        { id: '0b9e0645-206a-457c-8785-97163073366d', caption: 'תרומת בית עסק' }
      ]
    })
  })

  docref = new StringColumn();

  @ServerMethod()
  async createDonor() {
    let settings = await ApplicationSettings.getAsync(this.context);
    if (!settings.isSytemForMlt())
      throw "Not Allowed";
    this.context._setUser({
      id: 'WIX',
      name: 'WIX',
      roles: []
    });
    let f = this.context.for(Families).create();
    f.name.value = this.name.value;
    if (!this.address.value)
      this.address.value = '';
    f.address.value = this.address.value;
    f.phone1.value = this.phone.value;
    f.email.value = this.email.value;
    f.custom1.value = this.docref.value;
    f.familySource.value = this.donationType.value;

    await f.save();
    var quantity = 0;
    let self = this;
    async function addDelivery(type: string, q: number, isSelfDeliver: boolean) {
      if (q > 0) {
        quantity += q;
        await Families.addDelivery(f.id.value, {
          comment: '',
          basketType: type,
          courier: '',
          distCenter: allCentersToken,
          quantity: q,
          selfPickup: isSelfDeliver,
        }, self.context);
      }
    }
    if (this.computerAge.value === undefined || this.computerAge.value.isNew)
      await addDelivery('מחשב', this.computer.value, this.selfDeliver.value)
    else
      await addDelivery('מחשב_ישן', this.computer.value, this.selfDeliver.value);

    if (this.laptopAge.value === undefined || this.laptopAge.value.isNew)
      await addDelivery('לפטופ', this.laptop.value, this.selfDeliver.value)
    else
      await addDelivery('לפטופ_ישן', this.laptop.value, this.selfDeliver.value);

    await addDelivery('מסך', this.screen.value, this.selfDeliver.value);

    if (quantity == 0) {
      await Families.addDelivery(f.id.value, {
        comment: '',
        basketType: 'לא פורט',
        courier: '',
        distCenter: allCentersToken,
        quantity: 1,
        selfPickup: false
      }, this.context);
    }



    if (settings.registerFamilyReplyEmailText.value && settings.registerFamilyReplyEmailText.value != '') {
      let message = SendSmsAction.getMessage(settings.registerFamilyReplyEmailText.value,
        settings.organisationName.value, f.name.value, '', '', '');
      try {
        await EmailSvc.sendMail(settings.lang.thankYouForDonation, message, f.email.value, this.context);
      } catch (err) {
        console.error('send mail', err);
      }
    }
  }
}




