import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';
import './Login.css';

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
    <div className='login-page'>
      <div className='login-container'>
        <div className='login-box'>
          <h2>Login</h2>
          {errorMessage && (
            <div className="auth-error">
              {errorMessage}
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
            </div>
            <button type='submit' className='login-button'>
              Login
            </button>
            <Link to="/signup" className='create-account-button'>
              Create Account
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
