import { BackendMethod, Remult, SqlDatabase } from 'remult';
import { Roles } from '../auth/roles';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder"; import { DeliveryStatus } from '../families/DeliveryStatus';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { DateValueConverter } from 'remult/valueConverters';


export class PlaybackController {
    @BackendMethod({ allowed: Roles.admin })
    static async GetTimeline(fromDateDate: Date, toDateDate: Date, remult?: Remult, db?: SqlDatabase) {
        let f = SqlFor(remult.repo(FamilyDeliveries));



        toDateDate = new Date(toDateDate.getFullYear(), toDateDate.getMonth(), toDateDate.getDate() + 1);

        let sql = new SqlBuilder(remult);
        sql.addEntity(f, "Families");
        let r = (await db.execute(await sql.query({
            select: () => [f.id, f.addressLatitude, f.addressLongitude, f.deliverStatus, f.courier, f.courierAssingTime, f.deliveryStatusDate],
            from: f,
            where: () => {
                let where = [(f.where({ deliverStatus: DeliveryStatus.isAResultStatus(), deliveryStatusDate: { ">=": fromDateDate, "<": toDateDate } }))];
                return where;
            },
            orderBy: [f.addressLatitude, f.addressLongitude]
        })));

        return r.rows.map(x => {
            return {
                id: x[r.getColumnKeyInResultForIndexInSelect(0)],
                lat: +x[r.getColumnKeyInResultForIndexInSelect(1)],
                lng: +x[r.getColumnKeyInResultForIndexInSelect(2)],
                status: +x[r.getColumnKeyInResultForIndexInSelect(3)],
                courier: x[r.getColumnKeyInResultForIndexInSelect(4)],
                courierTime: DateValueConverter.toJson(x[r.getColumnKeyInResultForIndexInSelect(5)]),
                statusTime: DateValueConverter.toJson(x[r.getColumnKeyInResultForIndexInSelect(6)])
            } as familyQueryResult;

        }) as familyQueryResult[];
    }
}

export interface familyQueryResult {
    id: string;
    lat: number;
    lng: number;
    status: number;
    courier: string;
    courierTime: string;
    statusTime: string;
}