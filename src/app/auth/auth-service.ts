import { Injectable, NgZone } from "@angular/core";

import { DialogService } from "../select-popup/dialog";

import { openDialog, RouteHelperService } from '@remult/angular';
import { Remult, UserInfo } from 'remult';

import { Roles } from "./roles";
import { Sites } from "../sites/sites";
import { OverviewComponent } from "../overview/overview.component";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { YesNoQuestionComponent } from "../select-popup/yes-no-question/yes-no-question.component";
import { Subject } from "rxjs";
import { DeliveryReceptionComponent } from "../delivery-reception/delivery-reception.component";
import { JwtHelperService } from "@auth0/angular-jwt";
import { InitContext } from "../helpers/init-context";
import { AuthServiceController, loginArgs, TIMEOUT_MULTIPLIER_IN_SECONDS } from "./auth-service.controller";



let staticToken = '';
export function getToken() {
    return staticToken;
}
@Injectable()
export class TokenService {
    constructor(private remult: Remult) {

    }
    keyInStorage: string;
    async loadUserInfo() {
        let org = Sites.getOrganizationFromContext(this.remult);
        this.keyInStorage = "authorization/" + org;
        let token = sessionStorage.getItem(this.keyInStorage);
        if (!token)
            token = localStorage.getItem(this.keyInStorage);
        await this.setToken(token, false);
    }
    async setToken(token: string, remember: boolean) {
        staticToken = token;
        let user: UserInfo = undefined;
        if (token) {
            user = await AuthService.decodeJwt(token);

            await InitContext(this.remult, user);
            sessionStorage.setItem(this.keyInStorage, token);
            if (remember)
                localStorage.setItem(this.keyInStorage, token);
        }
        else {

            sessionStorage.removeItem(this.keyInStorage);
            localStorage.removeItem(this.keyInStorage);
        }

        if (toCompare(user) != toCompare(this.remult.user))
            await this.remult.setUser(user);

    }
}
function toCompare(r: UserInfo) {
    if (!r)
        return '';
    return JSON.stringify([r.roles, r.name, r.distributionCenter])


}

@Injectable()
export class AuthService {



    async loginFromSms(key: string) {
        var response = await AuthServiceController.loginFromSms(key);
        if (response.valid && await this.userAgreedToConfidentiality()) {
            await this.tokenService.setToken(response.authToken, false);
            this.dialog.analytics('login from sms');
            this.routeHelper.navigateToComponent((await import("../my-families/my-families.component")).MyFamiliesComponent);
            return true;
        }
        else {

            this.signout();
            this.routeHelper.navigateToComponent((await import('../users/login/login.component')).LoginComponent);
            this.failedSmsSignInPhone = response.phone;
            return false;
        }
    }
    failedSmsSignInPhone: string = undefined;

    async signOut() {
        await this.tokenService.setToken(undefined, true);
        this.routeHelper.navigateToComponent((await (import('../users/login/login.component'))).LoginComponent);
    }



    constructor(
        private dialog: DialogService,
        private tokenService: TokenService,

        private remult: Remult,
        private routeHelper: RouteHelperService,
        public settings: ApplicationSettings,
        private zone: NgZone
    ) {


        AuthService.doSignOut = () => {
            this.signout();
        }


        if (!settings.currentUserIsValidForAppLoadTest && this.remult.authenticated()) {
            this.signout();

        }
        if (dialog)
            remult.userChange.observe(() => {
                dialog.refreshEventListener(this.remult.isAllowed(Roles.distCenterAdmin));
                dialog.refreshFamiliesAndDistributionCenters();
            });

        window.onmousemove = () => this.refreshUserState();
        window.onkeydown = () => this.refreshUserState();
        this.inactiveTimeout();
        this.serverTokenRenewal();
        this.userInactive.subscribe(() => {
            if (this.remult.authenticated()) {
                this.dialog.Error(this.settings.lang.sessionExpiredPleaseRelogin);
                this.signout();

            }
            this.inactiveTimeout();
        });
    }
    static UpdateInfoComponent: { new(...args: any[]): any };
    remember: boolean;
    async login(args: loginArgs, remember: boolean) {
        this.remember = remember;
        let loginResponse = await AuthServiceController.login(args);
        if (loginResponse.authToken) {
            if (! await this.userAgreedToConfidentiality())
                loginResponse = {};
        }
        if (loginResponse.authToken) {
            await this.tokenService.setToken(loginResponse.authToken, remember);
            this.dialog.analytics('login ' + (this.remult.isAllowed(Roles.admin) ? 'delivery admin' : ''));
            if (this.failedSmsSignInPhone) {
                this.failedSmsSignInPhone = null;
                this.routeHelper.navigateToComponent((await import("../my-families/my-families.component")).MyFamiliesComponent);
            }
            else if (this.remult.isAllowed([Roles.admin, Roles.distCenterAdmin]))
                this.routeHelper.navigateToComponent((await import("../asign-family/asign-family.component")).AsignFamilyComponent);
            else if (this.remult.isAllowed(Roles.lab))
                this.routeHelper.navigateToComponent(DeliveryReceptionComponent)
            else if (this.remult.isAllowed(Roles.overview))
                this.routeHelper.navigateToComponent(OverviewComponent);
            else
                this.routeHelper.navigateToComponent((await import("../my-families/my-families.component")).MyFamiliesComponent);
        }
        else {
            this.signout();
        }
        return loginResponse;

    }

    private async userAgreedToConfidentiality() {
        if (this.settings.requireConfidentialityApprove) {
            if (await openDialog(YesNoQuestionComponent, x => x.args = {
                question: this.settings.lang.infoIsConfidential,
                yesButtonText: this.settings.lang.confirm
            }, y => y.yes)) {
                return true;
            } else
                return false;
        }
        else return true;

    }


    static doSignOut: () => void;


    async signout() {
        await this.tokenService.setToken(undefined, true);
        this.remult.clearAllCache();
        setTimeout(async () => {
            this.zone.run(async () =>
                this.routeHelper.navigateToComponent((await import("../users/login/login.component")).LoginComponent));
        }, 100);
    }

    userActivity;
    userInactive: Subject<any> = new Subject();


    inactiveTimeout() {
        if (this.settings.timeToDisconnect > 0)
            this.userActivity = setTimeout(() => this.userInactive.next(undefined), this.settings.timeToDisconnect * 1000 * TIMEOUT_MULTIPLIER_IN_SECONDS);
    }
    async serverTokenRenewal() {
        let renewPeriod = this.settings.timeToDisconnect;
        if (renewPeriod == 0)
            renewPeriod = 5;
        if (this.remult.authenticated())
            try {
                let r = await AuthServiceController.renewToken();
                if (!r)
                    this.signout();
                else
                    await this.tokenService.setToken(r, this.remember);

            }
            catch {
                //this.signout();
            }
        setTimeout(async () => {

            this.serverTokenRenewal();
        }, renewPeriod * 1000 * TIMEOUT_MULTIPLIER_IN_SECONDS)
    }


    refreshUserState() {
        clearTimeout(this.userActivity);
        this.inactiveTimeout();
    }
    static async decodeJwt(token: string): Promise<UserInfo> {
        return <UserInfo>new JwtHelperService().decodeToken(token);
    }




}
