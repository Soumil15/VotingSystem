import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Validation from './LoginValidation';
import axios from 'axios'



function Login() {

    const [values, setValues] = useState({
        email: '',
        password: ''
    })

    const [errors, setErrors] = useState({});

    const handleInput = (event) => {
        const { name, value } = event.target;
        setValues((prev) => ({ ...prev, [name]: value }));
    };

    const navigate = useNavigate();

    const handleSubmit = (event) => {
        event.preventDefault();
        setErrors(Validation(values));

        navigate('/Home');

        //Remove the comments 

        // if(errors.email==="" && errors.password === ""){
        //     axios.post('http://localhost:8081/login', values)
        //     .then(res => {
        //         if(res.data === "Success"){
        //             navigate('/home');
        //         } else{
        //             alert("Username or password dosnt match")
        //         }
        //     })
        //     .catch(err => console.log(err));
        // }


    }



    return (
        <div className='d-flex justify-content-center align-items-center bg-dark vh-100'>
            <div className='bg-white p-3 rounded w-25'>
                <h2>Login</h2>
                <form action='' onSubmit={handleSubmit}>
                    <div className='mb-3'>
                        <label htmlFor='email'><strong>Email</strong></label>
                        <input type='email' placeholder='Enter Email' name='email'
                            onChange={handleInput} className='form-control rounded-0' />
                        {errors.email && <span className='text-danger'>{errors.email}</span>}
                    </div>
                    <div className='mb-3'>
                        <label htmlFor='password'><strong>Password</strong></label>
                        <input type='password' placeholder='Enter Password' name='password'
                            onChange={handleInput} className='form-control rounded-0' />
                        {errors.password && <span className='text-danger'>{errors.password}</span>}
                    </div>
                    <button typeof='submit' className='btn btn-success w-100 '><strong>Login</strong></button>
                    <p>You agree to our terms and policy</p>
                    <Link to="/signup" className='btn btn-default border w-100 bg-dark text-light'>Create Account</Link>
                </form>
            </div>
        </div>
    )
}

export default Login
