import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup
  showPassword: boolean = false;
  constructor() { }

  passwordValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{5,15}$/
      const valid = passwordRegex.test(control.value);
      return valid ? null : { invalidPassword: { value: control.value } };
    };
  }
  ngOnInit(): void {
    //loginForm
    this.loginForm = new FormGroup({

      'loginEmail': new FormControl('', Validators.compose([Validators.required, Validators.email])),
      'loginPassword': new FormControl('', [Validators.required, this.passwordValidator()]),

    })
  }
  loginData() {
    console.log("loginData====>", this.loginForm.value);
  }

  togglePasswordVisibility() {

    this.showPassword = !this.showPassword
  }
}
