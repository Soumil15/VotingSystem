import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Signup.css';

function Signup() {
  const [values, setValues] = useState({
    voter_id: '',
    name: '',
    email: '',
    address: '',
    phone_number: '',
    password: ''
  });

  const [message, setMessage] = useState(''); // For success or error messages
  const [errors, setErrors] = useState({}); // For input field validations

  const navigate = useNavigate();

  const handleInput = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
  
    // Reset message state
    setMessage('');
    setErrors({});
  
    // Basic front-end validation
    const newErrors = {};
    if (!values.voter_id) newErrors.voter_id = "Voter ID is required";
    if (!values.name) newErrors.name = "Name is required";
    if (!values.email) newErrors.email = "Email is required";
    if (!values.address) newErrors.address = "Address is required";
    if (!values.phone_number) newErrors.phone_number = "Phone Number is required";
    if (!values.password) newErrors.password = "Password is required";
  
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
  
    try {
      // Call backend to register user and assign MetaMask account
      const response = await axios.post('http://localhost:8081/signup', values);
  
      if (response.status === 200) {
        const assignedAccount = response.data.account;
  
        // Display success message with the assigned MetaMask account
        setMessage(`User registered successfully! MetaMask account Assigned`);
  
        // Reset form fields
        setValues({ voter_id: '', name: '', email: '', address: '', phone_number: '', password: '' });
  
        // Wait 3 seconds before redirecting to the login page
        setTimeout(() => {
          navigate('/'); // Navigate to login page
        }, 3000);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage(error.response?.data?.error || error.response?.data?.details || 'Error signing up. Please try again later.');
      if (error.response?.status === 400) {
        // Handle validation errors
        if (error.response.data.error === 'Voter ID or email already exists') {
          setErrors({
            ...errors,
            voter_id: 'This Voter ID or email is already registered',
            email: 'This Voter ID or email is already registered'
          });
        }
      }
    }
  };
  

  return (
    <div className='signup-page'>
      <div className='signup-container'>
        <div className='signup-box'>
          <h2>Sign-Up</h2>
          {message && (
            <div className="auth-error">
              {message}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className='form-group'>
              <label htmlFor='voter_id'>Voter ID</label>
              <input
                type='text'
                placeholder='Enter Voter ID'
                name='voter_id'
                value={values.voter_id}
                onChange={handleInput}
                className='auth-input'
              />
              {errors.voter_id && <span className='error-message'>{errors.voter_id}</span>}
            </div>
            <div className='form-group'>
              <label htmlFor='name'>Name</label>
              <input
                type='text'
                placeholder='Enter Name'
                name='name'
                value={values.name}
                onChange={handleInput}
                className='auth-input'
              />
              {errors.name && <span className='error-message'>{errors.name}</span>}
            </div>
            <div className='form-group'>
              <label htmlFor='email'>Email</label>
              <input
                type='email'
                placeholder='Enter Email'
                name='email'
                value={values.email}
                onChange={handleInput}
                className='auth-input'
              />
              {errors.email && <span className='error-message'>{errors.email}</span>}
            </div>
            <div className='form-group'>
              <label htmlFor='address'>Address</label>
              <input
                type='text'
                placeholder='Enter Address'
                name='address'
                value={values.address}
                onChange={handleInput}
                className='auth-input'
              />
              {errors.address && <span className='error-message'>{errors.address}</span>}
            </div>
            <div className='form-group'>
              <label htmlFor='phone_number'>Phone Number</label>
              <input
                type='text'
                placeholder='Enter Phone Number'
                name='phone_number'
                value={values.phone_number}
                onChange={handleInput}
                className='auth-input'
              />
              {errors.phone_number && <span className='error-message'>{errors.phone_number}</span>}
            </div>
            <div className='form-group'>
              <label htmlFor='password'>Password</label>
              <input
                type='password'
                placeholder='Enter Password'
                name='password'
                value={values.password}
                onChange={handleInput}
                className='auth-input'
              />
              {errors.password && <span className='error-message'>{errors.password}</span>}
            </div>
            <div className="signup-button-container">
                <button type='submit' className='signup-submit-button'>
                    Sign up
                </button>
                <Link to="/" className='signup-login-button'>
                    Login
                </Link>
            </div>
            <p className='signup-terms-text'>You agree to our terms and policy</p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;
