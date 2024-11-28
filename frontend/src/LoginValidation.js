function Validation(values) {
    let errors = {};

    // Voter ID Validation
    if (!values.voter_id || values.voter_id.trim() === '') {
        errors.voter_id = 'Voter ID is required';
    } else {
        errors.voter_id = '';
    }

    // Password Validation
    if (!values.password || values.password.trim() === '') {
        errors.password = 'Password is required';
    } else {
        errors.password = '';
    }

    return errors;
}

export default Validation;
