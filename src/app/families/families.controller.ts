import { Component, OnInit, ViewChild, Input, ElementRef } from '@angular/core';
import { Filter, BackendMethod, SqlDatabase, EntityFilter } from 'remult';

import { Families, AreaColumn, sendWhatsappToFamily, canSendWhatsapp } from './families';

import { YesNo } from "./YesNo";



import { DialogService, DestroyHelper } from '../select-popup/dialog';


import { DomSanitizer } from '@angular/platform-browser';



import { DataControlInfo, DataControlSettings, GridSettings } from '@remult/angular/interfaces';
import { BusyService, openDialog } from '@remult/angular';
import * as chart from 'chart.js';
import { Stats, FaimilyStatistics, colors } from './stats-action';

import { reuseComponentOnNavigationAndCallMeWhenNavigatingToIt, leaveComponent } from '../custom-reuse-controller-router-strategy';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { Route } from '@angular/router';

import { Remult } from 'remult';



import { saveToExcel } from '../shared/saveToExcel';
import { AdminGuard } from '../auth/guards';
import { Roles } from '../auth/roles';
import { MatTabGroup } from '@angular/material/tabs';

import { ApplicationSettings, getCustomColumnVisible, getSettings } from '../manage/ApplicationSettings';

import { FamilyStatus } from './FamilyStatus';
import { NewDelivery, UpdateArea, UpdateBasketType, UpdateDefaultDistributionList, UpdateDefaultVolunteer, UpdateFamilySource, updateGroup, UpdateQuantity, UpdateSelfPickup, UpdateStatus } from './familyActions';

import { MergeFamiliesComponent } from '../merge-families/merge-families.component';
import { sortColumns } from '../shared/utils';
import { columnOrderAndWidthSaver } from './columnOrderAndWidthSaver';
import { BasketType } from './BasketType';
import { use } from '../translate';
import { ChartType } from 'chart.js';
import { GroupsValue } from '../manage/groups';
import { EditCustomMessageComponent } from '../edit-custom-message/edit-custom-message.component';
import { messageMerger } from "../edit-custom-message/messageMerger";
import { makeId } from '../helpers/helpers';
import { UITools } from '../helpers/init-context';


export class FamiliesController {
    @BackendMethod({ allowed: Roles.admin })
    static async getCities(remult?: Remult, db?: SqlDatabase): Promise<{ city: string, count: number }[]> {
        var sql = new SqlBuilder(remult);
        let f = SqlFor(remult.repo(Families));
        let r = await db.execute(await sql.query({
            from: f,
            select: () => [f.city, 'count (*) as count'],
            where: () => [f.where({ status: FamilyStatus.Active })],
            groupBy: () => [f.city],
            orderBy: [{ field: f.city }]

        }));
        return r.rows.map(x => ({
            city: x.city,
            count: x.count
        }));
    }
}