import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-fp-student-list',
  templateUrl: './fp-student-list.component.html',
  styleUrls: ['./fp-student-list.component.css']
})
export class FpStudentListComponent {

    @Input() set studentList(value: any) {
      this.StudentList = value ?? [];
    }
    get studentList() {
      return this.StudentList;
    }
  @Input() selectedLanguage: any;
  @Input() selectedTab: any;

  @Output() studentSelectEvent = new EventEmitter();

  onStudentSelected(profile: any) {
    let studs = this.StudentList.filter((x:any)=>x.selected==true).map((x:any)=>x.KidId);
    if(profile) {
        if(!profile.selected) {
            studs.push(profile.KidId);
            profile.selected = true;
        } else {
            let index = studs.findIndex(x => x == profile.KidId);
            profile.selected = false;
            studs.splice(index, 1);
        }
    }
    this.studentSelectEvent.emit(studs);
  }

  getTotalKidsCount(){
    return this.StudentList.length;
  }

  getSelectedKidsCount(){
    return this.StudentList.filter((x:any)=>x.selected==true).length;
  }

  StudentList: any[] = [];

}
