import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import axios from 'axios';

import BaseForm from '../common/components/Form/BaseForm';
import FormInput from '../common/components/Form/FormInput';
import Button from '../common/components/Button';

const registerSchema = yup.object().shape({
  username: yup.string().required('Username is required').min(3, 'At least 3 characters'),
  email: yup.string()
    .required('Email is required')
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Must be a valid email format (e.g. name@domain.com)'),
  password: yup.string().required('Password is required').min(6, 'At least 6 characters'),
  firstname: yup.string().required('First name is required'),
  lastname: yup.string().required('Last name is required'),
  companyname: yup.string().required('Company name is required'),
  category: yup.string().required('Vendor category is required'),
  phone: yup.string()
    .required('Phone number is required')
    .matches(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  address: yup.string().required('Business address is required'),
  gstnumber: yup.string().nullable().test(
    'gst-format',
    'Invalid GST format',
    value => !value || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)
  ),
  pannumber: yup.string().nullable().test(
    'pan-format',
    'Invalid PAN format',
    value => !value || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)
  )
});

const Register = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const methods = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      firstname: '',
      lastname: '',
      companyname: '',
      category: '',
      phone: '',
      address: '',
      gstnumber: '',
      pannumber: ''
    }
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/register', data);
      setSuccessMsg('Registration successful! Your profile is pending review. Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please check details or server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light py-5">
      <div className="card shadow-lg p-4 border-0" style={{ width: '100%', maxWidth: '650px', borderRadius: '14px' }}>
        <div className="text-center mb-4">
          <div className="bg-primary rounded-3 p-3 d-inline-flex align-items-center justify-content-center mb-3 shadow-sm" style={{ width: '50px', height: '50px' }}>
            <i className="bi bi-shuffle text-white fw-bold fs-4" />
          </div>
          <h4 className="fw-bold text-dark mb-1">Vendor Self-Registration</h4>
          <p className="text-muted small">Register your company for the VendorBridge ERP procurement network</p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger py-2 px-3 small border-0 text-center mb-3" style={{ borderRadius: '8px' }}>
            <i className="bi bi-exclamation-octagon me-1" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success py-2 px-3 small border-0 text-center mb-3" style={{ borderRadius: '8px' }}>
            <i className="bi bi-check-circle me-1" />
            {successMsg}
          </div>
        )}

        <BaseForm methods={methods} onSubmit={onSubmit}>
          {/* Section 1: User Account */}
          <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
            <i className="bi bi-person-badge me-2" />Contact Person & Account Credentials
          </h6>
          <div className="row">
            <div className="col-12 col-md-6">
              <FormInput name="firstname" label="First Name" placeholder="Contact first name" required={true} />
            </div>
            <div className="col-12 col-md-6">
              <FormInput name="lastname" label="Last Name" placeholder="Contact last name" required={true} />
            </div>
          </div>
          <div className="row">
            <div className="col-12 col-md-6">
              <FormInput name="username" label="Login Username" placeholder="Choose a username" required={true} />
            </div>
            <div className="col-12 col-md-6">
              <FormInput name="password" label="Password" type="password" placeholder="Min. 6 characters" required={true} />
            </div>
          </div>

          {/* Section 2: Company Info */}
          <h6 className="fw-bold text-primary border-bottom pb-2 mt-4 mb-3">
            <i className="bi bi-building me-2" />Company Profile & Tax Details
          </h6>
          <div className="row">
            <div className="col-12 col-md-6">
              <FormInput name="companyname" label="Company Name" placeholder="Full registered company name" required={true} />
            </div>
            <div className="col-12 col-md-6">
              <FormInput name="category" label="Vendor Category" placeholder="e.g. IT Equipment, Office Supplies" required={true} />
            </div>
          </div>
          
          <div className="row">
            <div className="col-12 col-md-6">
              <FormInput name="email" label="Business Email" type="email" placeholder="sales@company.com" required={true} />
            </div>
            <div className="col-12 col-md-6">
              <FormInput name="phone" label="Contact Phone" placeholder="e.g. 9876543210 (10 digits)" required={true} />
            </div>
          </div>

          <div className="row">
            <div className="col-12 col-md-6">
              <FormInput name="gstnumber" label="GSTIN Number (Optional)" placeholder="e.g. 27AAAAA1111A1Z1" />
            </div>
            <div className="col-12 col-md-6">
              <FormInput name="pannumber" label="PAN Number (Optional)" placeholder="e.g. ABCDE1234F" />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label small fw-semibold text-dark">Business Address <span className="text-danger">*</span></label>
            <textarea 
              {...methods.register('address')}
              className={`form-control ${methods.formState.errors.address ? 'is-invalid' : ''}`}
              placeholder="Full business office address"
              rows="3"
              style={{ borderRadius: '8px' }}
            />
            {methods.formState.errors.address && (
              <div className="invalid-feedback">{methods.formState.errors.address.message}</div>
            )}
          </div>
          
          <Button 
            type="submit" 
            variant="primary" 
            className="w-100 py-2 mt-4" 
            isLoading={loading}
          >
            Submit Registration
          </Button>
        </BaseForm>
        <div className="text-center mt-3">
          <span className="text-muted small">Already have an account? </span>
          <Link to="/login" className="text-primary small fw-semibold text-decoration-none">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
