import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './login.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Import eye icons

const Login = () => {
    const [formData, setFormData] = useState({ emailOrMobile: '', password: '' });
    const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const validateInput = () => {
        const { emailOrMobile, password } = formData;

        // Regex for email, phone, and password
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const mobileRegex = /^[6-9]\d{9}$/;
        const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!emailRegex.test(emailOrMobile) && !mobileRegex.test(emailOrMobile)) {
            toast.error('Please enter a valid email or mobile number');
            return false;
        }

        if (!passwordRegex.test(password)) {
            toast.error(
                'Password must be at least 8 characters long, contain uppercase, lowercase, a number, and a special character'
            );
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateInput()) return;

        try {
            const response = await axios.post('https://contact-wave-backend-1.onrender.com/login', formData, {
                withCredentials: true, // Send cookies with the request
            });

            if (response.data.success) {
                toast.success('Login successful!');
                setTimeout(() => {
                    navigate('/create-message');
                }, 3500);
            } else {
                toast.error('Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Error logging in:', error);
            toast.error('Error during login. Please try again later.');
        }
    };

    return (
        <div className="page-container">
            <ToastContainer autoClose={3000} />
            <div className="card login-card">
                <div className="login-header">
                    <h1>LOGIN</h1>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            className="form-input"
                            type="text"
                            name="emailOrMobile"
                            value={formData.emailOrMobile}
                            onChange={handleChange}
                            required
                            placeholder=" "
                        />
                        <label className="form-label">EMAIL OR MOBILE NUMBER</label>
                    </div>
                    <div className="form-group">
                        <input
                            className="form-input"
                            type={showPassword ? 'text' : 'password'} // Toggle input type
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder=" "
                        />
                        <label className="form-label">PASSWORD</label>
                        <span
                            className="password-toggle-icon"
                            onClick={() => setShowPassword(!showPassword)} // Toggle password visibility
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />} {/* Toggle eye icon */}
                        </span>
                    </div>
                    <button type="submit" className="login-button">
                        LOGIN
                    </button>
                </form>
                <div className="auth-footer login-footer">
                    Don't have an account?
                    <Link to="/register">Register here</Link>
                </div>
                <div className="forgot-password">
                    <Link to="/forgot-password">Forgot Password?</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;