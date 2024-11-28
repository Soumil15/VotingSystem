import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [values, setValues] = useState({
    voter_id: '',
    password: '',
  });

  const [errorMessage, setErrorMessage] = useState(''); // Error message state

  const handleInput = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const voter_id = localStorage.getItem('voter_id');
    if (voter_id) {
        navigate('/Home');
    }
  }, [navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();

    // Ensure both fields are filled before making a request
    if (!values.voter_id || !values.password) {
      setErrorMessage('Please fill in all the fields');
      return;
    }

    axios
      .post('http://localhost:8081/login', values)
      .then((res) => {
        if (res.status === 200) {
          // Save voter_id to localStorage
          localStorage.setItem('voter_id', res.data.user.voter_id);
          // Navigate to Home
          navigate('/Home');
        } else {
          setErrorMessage('Voter ID or password is incorrect');
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage('Error logging in. Please try again.');
      });
  };

  return (
    <div className='d-flex justify-content-center align-items-center bg-dark vh-100'>
      <div className='bg-white p-3 rounded w-25'>
        <h2>Login</h2>

        {/* Display error message */}
        {errorMessage && (
          <div className="alert alert-danger text-center">
            {errorMessage}
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
          </div>
          <button type='submit' className='btn btn-success w-100'>
            <strong>Login</strong>
          </button>
          <Link to="/signup" className='btn btn-default border w-100 bg-dark text-light'>Create Account</Link>
        </form>
      </div>
    </div>
  );
}

export default Login;
