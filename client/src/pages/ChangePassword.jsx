import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../common/components/PageHeader';
import Card from '../common/components/Card';
import Input from '../common/components/Input';
import Button from '../common/components/Button';
import { useAuth } from '../common/contexts/AuthContext';

const ChangePassword = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formErrors, setFormErrors] = useState({});

  const changePasswordMutation = useMutation({
    mutationFn: async ({ oldPassword, newPassword }) => {
      const res = await axios.post('http://localhost:5000/api/auth/changepassword', {
        oldPassword,
        newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      alert('Password changed successfully! For security, please log in again.');
      logout();
      navigate('/login');
    },
    onError: (err) => {
      const errMsg = err.response?.data?.message || 'Failed to change password. Please verify your current password.';
      setFormErrors({ submit: errMsg });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!oldPassword) {
      errors.oldPassword = 'Current password is required.';
    }
    if (!newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters long.';
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    changePasswordMutation.mutate({ oldPassword, newPassword });
  };

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="Change Password"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Change Password', link: '/change-password' },
        ]}
      />

      <div className="row justify-content-center mt-4">
        <div className="col-12 col-md-8 col-lg-6">
          <Card title="Update Security Credentials">
            <form onSubmit={handleSubmit} noValidate>
              {formErrors.submit && (
                <div className="alert alert-danger p-3 mb-4 rounded-3 small fw-medium" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2" />
                  {formErrors.submit}
                </div>
              )}

              <Input
                label="Current Password"
                type="password"
                name="oldPassword"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                error={formErrors.oldPassword}
                placeholder="Enter current password"
              />

              <Input
                label="New Password"
                type="password"
                name="newPassword"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={formErrors.newPassword}
                placeholder="Minimum 6 characters"
              />

              <Input
                label="Confirm New Password"
                type="password"
                name="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={formErrors.confirmPassword}
                placeholder="Re-type new password"
              />

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <Button
                  type="button"
                  variant="light"
                  onClick={() => navigate('/dashboard')}
                  disabled={changePasswordMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={changePasswordMutation.isPending}
                >
                  Change Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
