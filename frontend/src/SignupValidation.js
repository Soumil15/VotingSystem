function Validation(values) {
    let error = {}

    // Voter ID Validation
    if (!values.voter_id || values.voter_id.trim() === "") {
        error.voter_id = "Voter ID is required";
    } else {
        error.voter_id = "";
    }

    // Name Validation
    if (!values.name || values.name.trim() === "") {
        error.name = "Name is required";
    } else {
        error.name = "";
    }

    // Email Validation
    if (!values.email || values.email.trim() === "") {
        error.email = "Email is required";
    } else {
        error.email = "";
    }

    // Address Validation
    if (!values.address || values.address.trim() === "") {
        error.address = "Address is required";
    } else {
        error.address = "";
    }

    // Phone Number Validation
    if (!values.phone_number || values.phone_number.trim() === "") {
        error.phone_number = "Phone number is required";
    } else if (!/^\d{10}$/.test(values.phone_number)) {
        error.phone_number = "Phone number must be 10 digits";
    } else {
        error.phone_number = "";
    }

    // Password Validation
    if (!values.password || values.password.trim() === "") {
        error.password = "Password is required";
    } else {
        error.password = "";
    }

    return error;
}

export default Validation;
