import { Component, OnInit } from '@angular/core';
import { Context, SqlDatabase } from 'remult';
import { GridSettings, openDialog } from '@remult/angular';
import { Helpers } from '../helpers/helpers';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { RegisterURL } from './regsiter-url';

@Component({
  selector: 'app-register-url',
  templateUrl: './register-url.component.html',
  styleUrls: ['./register-url.component.scss']
})

export class RegisterURLComponent implements OnInit {

  constructor(private context: Context) { }
  urls = new GridSettings(this.context.for(RegisterURL), {
    allowUpdate: true,
    allowInsert: true,
    numOfColumnsInGrid: 2,

    orderBy: su =>  su.prettyName,
    rowsInPage: 100
    ,
    gridButtons: [{
      name: 'עדכן ממתנדבים ותורמים',
      click: async () => {
        if (await openDialog(YesNoQuestionComponent, q => q.args = {
          question: 'האם להוסיף נתונים מטבלאות תורמים ומתנדבים?'
        }, q => q.yes)) {
          await RegisterURL.loadUrlsFromTables();
          await this.urls.reloadData();
        }
      }
    }]
  });

  ngOnInit() { }

}
