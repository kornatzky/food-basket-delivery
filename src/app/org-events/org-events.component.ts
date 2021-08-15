import { Component, OnDestroy, OnInit } from '@angular/core';
import { Event } from '../events/events';

import { BackendMethod, Context, SqlDatabase, Unobserve } from 'remult';
import { EventInList, eventStatus } from '../events/events';
import { RegisterToEvent } from '../event-info/RegisterToEvent';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { Phone } from '../model-shared/phone';
import { Sites } from '../sites/sites';
import { createSiteContext, InitContext } from '../helpers/init-context';
import { Roles } from '../auth/roles';
import { ApplicationSettings, getSettings, setSettingsForSite, settingsForSite } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';
import { SqlBuilder, SqlFor } from '../model-shared/SqlBuilder';
import { Events } from 'pg';

@Component({
  selector: 'app-org-events',
  templateUrl: './org-events.component.html',
  styleUrls: ['./org-events.component.scss']
})
export class OrgEventsComponent implements OnInit, OnDestroy {

  constructor(private context: Context, public settings: ApplicationSettings, private dialog: DialogService) {

  }
  isGuest = Sites.getOrganizationFromContext(this.context) == Sites.guestSchema;
  getLogo() {
    return ApplicationSettings.get(this.context).logoUrl;

  }
  ngOnDestroy(): void {
    if (this.unObserve)
      this.unObserve();
  }
  unObserve: Unobserve;
  isAdmin() {
    return this.context.isAllowed(Roles.distCenterAdmin);
  }
  events: EventInList[] = [];
  async ngOnInit() {
    if (this.isAdmin())
      return

    let sites = (new URL(document.location.href)).searchParams.get("sites");
    this.unObserve = await RegisterToEvent.volunteerInfoChanged.dispatcher.observe(async () => {
      if (this.isGuest) {
        this.dialog.trackVolunteer("list-events");
        this.events = await OrgEventsComponent.getAllEvents(RegisterToEvent.volunteerInfo.phone, sites);
      }
      else
        this.events = await OrgEventsComponent.getEvents(RegisterToEvent.volunteerInfo.phone);
    })
  }
  @BackendMethod({ allowed: true })
  static async getAllEvents(phone: string, sitesFilter: string, context?: Context, db?: SqlDatabase): Promise<EventInList[]> {
    let r: EventInList[] = [];
    let sql = new SqlBuilder(context);
    let e = SqlFor(context.for(Event));

    let schemas = Sites.schemas;
    if (sitesFilter) {
      let x = sitesFilter.split(',');
      if (x.length > 0)
        schemas = x;
    }
    let query = '';
    for (const org of schemas) {
      if (query != '')
        query += ' union all ';
      query += await sql.build('select ', ["'" + org + "' site"], ' from ', org + '.' + await e.metadata.getDbName(),
        " where ", [e.eventStatus.isEqualTo(eventStatus.active).and(e.eventDate.isGreaterOrEqualTo(new Date()))]);
    }
    let sites = (await db.execute(' select distinct site from (' + query + ') x')).rows.map(x => x.site);

    for (const org of sites) {

      let c = await createSiteContext(org, context);

      let settings = settingsForSite.get(org);
      if (!settings) {
        settings = await ApplicationSettings.getAsync(c);
        setSettingsForSite(org, settings);
      }

      if (!settings.donotShowEventsInGeneralList && !settings.forWho.args.leftToRight) {
        let items = await OrgEventsComponent.getEvents(phone, c);
        r.push(...items.map(i => ({ ...i, site: org })));
      }

    }
    return r;
  }

  @BackendMethod({ allowed: true })
  static async getEvents(phone: string, context?: Context): Promise<EventInList[]> {


    let helper: HelpersBase = context.currentUser;
    if (!helper && phone)
      helper = await context.for(Helpers).findFirst(h => h.phone.isEqualTo(new Phone(phone)));

    return Promise.all((await context.for(Event).find({
      orderBy: e => [e.eventDate, e.startTime],
      where: e => e.eventStatus.isEqualTo(eventStatus.active).and(e.eventDate.isGreaterOrEqualTo(new Date()))
    })).map(async e => await e.toEventInList(helper)));
  }

}
