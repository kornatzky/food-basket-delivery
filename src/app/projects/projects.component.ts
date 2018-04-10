import { Component, OnInit, ViewChild } from '@angular/core';
import { GridSettings } from 'radweb';
import { Items, Projects } from '../models';
import { ProjectItemsComponent } from '../project-items/project-items.component';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  ngOnInit(): void {
    this.projects.getRecords();
  }
  projects = new GridSettings(new Projects(), {
    onNewRow: p => p.id.setToNewId()
  });
  

  saveAll(projectsItems: ProjectItemsComponent) {
    this.projects.currentRow.save();
    projectsItems.saveAll();
  }

}
