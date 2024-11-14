function Validation(values){
    let error = {}
    const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const password_pattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]{8,}$/

    if(values.email === ""){
        error.email = "Enter the Email"
    }
    else if(!email_pattern.test(values.email)){
        error.email = "Email Didn't match"
    }else{
        error.email = ""
    }

    if(values.password === ""){
        error.password="Password didn't match"
    } else if(!password_pattern.test(values.password)){
        error.password = "Password didn't match"
    }
    else{
        error.password = ""
    }
    return error;
    
}

export default Validation;