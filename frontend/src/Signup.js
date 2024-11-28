import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

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
      console.error(error);
      setMessage('Error signing up. Please try again later.');
    }
  };
  

  return (
    <div className='d-flex justify-content-center align-items-center bg-dark vh-100'>
      <div className='bg-white p-3 rounded w-25'>
        <h2>Sign-Up</h2>

        {message && (
          <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-danger'} text-center`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className='mb-3'>
            <label htmlFor='voter_id'><strong>Voter ID</strong></label>
            <input
              type='text'
              placeholder='Enter Voter ID'
              name='voter_id'
              value={values.voter_id}
              onChange={handleInput}
              className='form-control rounded-0'
            />
            {errors.voter_id && <span className='text-danger'>{errors.voter_id}</span>}
          </div>

          <div className='mb-3'>
            <label htmlFor='name'><strong>Name</strong></label>
            <input
              type='text'
              placeholder='Enter Name'
              name='name'
              value={values.name}
              onChange={handleInput}
              className='form-control rounded-0'
            />
            {errors.name && <span className='text-danger'>{errors.name}</span>}
          </div>

          <div className='mb-3'>
            <label htmlFor='email'><strong>Email</strong></label>
            <input
              type='email'
              placeholder='Enter Email'
              name='email'
              value={values.email}
              onChange={handleInput}
              className='form-control rounded-0'
            />
            {errors.email && <span className='text-danger'>{errors.email}</span>}
          </div>

          <div className='mb-3'>
            <label htmlFor='address'><strong>Address</strong></label>
            <input
              type='text'
              placeholder='Enter Address'
              name='address'
              value={values.address}
              onChange={handleInput}
              className='form-control rounded-0'
            />
            {errors.address && <span className='text-danger'>{errors.address}</span>}
          </div>

          <div className='mb-3'>
            <label htmlFor='phone_number'><strong>Phone Number</strong></label>
            <input
              type='text'
              placeholder='Enter Phone Number'
              name='phone_number'
              value={values.phone_number}
              onChange={handleInput}
              className='form-control rounded-0'
            />
            {errors.phone_number && <span className='text-danger'>{errors.phone_number}</span>}
          </div>

          <div className='mb-3'>
            <label htmlFor='password'><strong>Password</strong></label>
            <input
              type='password'
              placeholder='Enter Password'
              name='password'
              value={values.password}
              onChange={handleInput}
              className='form-control rounded-0'
            />
            {errors.password && <span className='text-danger'>{errors.password}</span>}
          </div>

          <button type='submit' className='btn btn-success w-100'><strong>Sign up</strong></button>
          <p>You agree to our terms and policy</p>
          <Link to="/" className='btn btn-default border w-100 bg-dark text-light'>Login</Link>
        </form>
      </div>
    </div>
  );
}

export default Signup;
