import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators, } from '@angular/forms';


@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  SignupForm: FormGroup;
  showconPassword: boolean = false
  showPassword: boolean = false;
  submitted: boolean
  constructor(private fb: FormBuilder) { }
  // Regex validator 
  nameValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const nameRegex = /^[A-Za-z]{4,}$/;
      const valid = nameRegex.test(control.value);
      return valid ? null : { invalidName: { value: control.value } };
    };
  }

  lastNameValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const nameRegex = /^[A-Za-z]{4,}$/;
      const valid = nameRegex.test(control.value);
      return valid ? null : { invalidlastName: { value: control.value } };
    };
  }
  numberValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const numberRegex = /^\d+$/;
      const valid = numberRegex.test(control.value);
      return valid ? null : { invalidNumber: { value: control.value } };
    };
  }
  passwordValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{5,15}$/
      const valid = passwordRegex.test(control.value);
      return valid ? null : { invalidPassword: { value: control.value } };
    };
  }
  conpasswordValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{5,15}$/
      const valid = passwordRegex.test(control.value);
      return valid ? null : { invalidConPassword: { value: control.value } };
    };
  }

  //ngOnInit
  ngOnInit(): void {

    //singnupForm
    this.SignupForm = new FormGroup({
      'firstName': new FormControl('', [Validators.required, this.nameValidator()]),
      'lastName': new FormControl('', [Validators.required, this.lastNameValidator()]),
      'email': new FormControl('', Validators.compose([Validators.required, Validators.email])),
      'password': new FormControl('', [Validators.required, this.passwordValidator()]),
      'number': new FormControl('', [Validators.required, this.numberValidator()]),
      'confirmPassword': new FormControl('', [Validators.required, this.conpasswordValidator()]),
    },
      {
        validators: <any>this.mustMatch('password', 'confirmPassword')
      }
    )


  }
  signupData() {
    console.log("signupData", this.SignupForm.value);
  }
  //password Match
  mustMatch(password: any, conpassword: any) {
    return (FormGroup: FormGroup) => {
      const passwordControl = FormGroup.controls[password]
      const conpasswordControl = FormGroup.controls[conpassword]
      if (conpasswordControl.errors && !conpasswordControl.errors['mustMatch']) {
        return
      }
      if (passwordControl.value !== conpasswordControl.value) {
        conpasswordControl.setErrors({ mustMatch: true })
      }
      else {
        conpasswordControl.setErrors(null)
      }
    }
  }
  togglePasswordVisibility(e): void {
    if (e == "confirmPassword") {

      this.showconPassword = !this.showconPassword
    }
    else {

      this.showPassword = !this.showPassword; //  Toggle the password visibility
    }
  }



}
