import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import axios from 'axios';

import PageHeader from '../common/components/PageHeader';
import Button from '../common/components/Button';
import Card from '../common/components/Card';
import Badge from '../common/components/Badge';
import FilterBar from '../common/components/FilterBar';
import SearchBar from '../common/components/SearchBar';
import Select from '../common/components/Select';
import BaseTable from '../common/components/Table/BaseTable';
import Modal from '../common/components/Modal';
import BaseForm from '../common/components/Form/BaseForm';
import FormInput from '../common/components/Form/FormInput';
import FormSelect from '../common/components/Form/FormSelect';
import ConfirmDialog from '../common/components/ConfirmDialog';

// Seeded database role UUIDs for static mapping (Stage 1 Admin Module scope)
const ROLE_OPTIONS = [
  { value: '4a1f13f1-d5d1-4cb5-827d-0d6bc9f00df9', label: 'Manager' },
  { value: 'e46a7be7-a9a3-41fa-8a8b-3e5e4071ecbd', label: 'Procurement Officer' },
];

const getRoleName = (roleid) => {
  if (roleid === 'd1b0337c-f230-4e1b-ae23-1d07b46ee334') return 'Admin';
  if (roleid === '4a1f13f1-d5d1-4cb5-827d-0d6bc9f00df9') return 'Manager';
  if (roleid === 'e46a7be7-a9a3-41fa-8a8b-3e5e4071ecbd') return 'ProcurementOfficer';
  if (roleid === 'b78e1b3d-71b5-4b08-b0a3-bf2e8964d4b3') return 'Vendor';
  return 'Unknown';
};

// Form Validation Schema
const userFormSchema = yup.object().shape({
  firstname: yup.string().required('First name is required').max(100),
  lastname: yup.string().required('Last name is required').max(100),
  email: yup.string().required('Email is required').email('Must be a valid email').max(255),
  phonenumber: yup.string().nullable().max(50),
  username: yup.string().required('Username is required').min(3).max(100),
  roleid: yup.string().required('Role is required'),
  password: yup.string().when('$isEdit', {
    is: false,
    then: () => yup.string().required('Password is required').min(6, 'At least 6 characters'),
    otherwise: () => yup.string().nullable()
  })
});

const Users = () => {
  const queryClient = useQueryClient();
  
  // Table filters & pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdat');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modals & Overlay toggle state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pwdResetOpen, setPwdResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetError, setResetError] = useState('');

  // Setup Form Context methods
  const methods = useForm({
    resolver: yupResolver(userFormSchema),
    context: { isEdit: isEditMode },
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
      phonenumber: '',
      username: '',
      roleid: '',
      password: ''
    }
  });

  // Query: Fetch users list from backend API
  const { data: usersResponse, isLoading, isFetching } = useQuery({
    queryKey: ['users', page, limit, search, filterRole, filterStatus, sortBy, sortOrder],
    queryFn: async () => {
      // Build query params
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
        search
      };
      if (filterRole) params.roleid = filterRole;
      if (filterStatus !== '') params.isactive = filterStatus === 'active';

      const res = await axios.get('http://localhost:5000/api/user', { params });
      return res.data;
    }
  });

  // Mutation: Create user
  const createUserMutation = useMutation({
    mutationFn: (data) => axios.post('http://localhost:5000/api/user', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setModalOpen(false);
      methods.reset();
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to create user');
    }
  });

  // Mutation: Update user
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => axios.put(`http://localhost:5000/api/user/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setModalOpen(false);
      methods.reset();
      setEditingUserId(null);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update user');
    }
  });

  // Mutation: Toggle status (activate/deactivate)
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isactive }) => axios.patch(`http://localhost:5000/api/user/${id}/status`, { isactive }),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setStatusConfirmOpen(false);
      setSelectedUser(null);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  });

  // Mutation: Reset password
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }) => axios.post(`http://localhost:5000/api/user/${id}/resetpassword`, { password }),
    onSuccess: () => {
      alert('Password successfully reset and sessions revoked!');
      setPwdResetOpen(false);
      setSelectedUser(null);
      setResetPasswordVal('');
      setResetError('');
    },
    onError: (err) => {
      setResetError(err.response?.data?.message || 'Failed to reset password');
    }
  });

  // Form Submit handler
  const handleFormSubmit = (data) => {
    if (isEditMode) {
      updateUserMutation.mutate({ id: editingUserId, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    methods.reset({
      firstname: '',
      lastname: '',
      email: '',
      phonenumber: '',
      username: '',
      roleid: '',
      password: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setIsEditMode(true);
    setEditingUserId(user.id);
    methods.reset({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phonenumber: user.phonenumber || '',
      username: user.username,
      roleid: user.roleid,
      password: '' // do not set password on edit
    });
    setModalOpen(true);
  };

  // Define table columns
  const tableColumns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => `${row.firstname} ${row.lastname}`
    },
    { key: 'username', header: 'Username', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'roleid',
      header: 'Role',
      sortable: false,
      render: (row) => (
        <Badge variant={getRoleName(row.roleid) === 'Admin' ? 'danger' : 'secondary'}>
          {getRoleName(row.roleid)}
        </Badge>
      )
    },
    {
      key: 'isactive',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.isactive ? 'success' : 'dark'}>
          {row.isactive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        // Prevent editing or deactivating administrative seed profile directly to keep sandbox clean
        if (row.username === 'admin') return <span className="text-muted small">System Seed</span>;
        
        return (
          <div className="d-flex align-items-center gap-2">
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={() => openEditModal(row)}
            >
              <i className="bi bi-pencil" />
            </Button>
            
            <Button 
              variant={row.isactive ? 'outline-dark' : 'outline-success'} 
              size="sm" 
              onClick={() => {
                setSelectedUser(row);
                setStatusConfirmOpen(true);
              }}
            >
              <i className={`bi bi-shield-${row.isactive ? 'slash' : 'check'}`} />
            </Button>

            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={() => {
                setSelectedUser(row);
                setPwdResetOpen(true);
              }}
            >
              <i className="bi bi-key" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="container-fluid p-0">
      <PageHeader
        title="User Management"
        breadcrumbs={[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Users', link: '/users' }
        ]}
        action={
          <Button variant="primary" onClick={openAddModal}>
            <i className="bi bi-plus-lg me-1" /> Add User
          </Button>
        }
      />

      {/* Filter panel */}
      <FilterBar onClear={() => {
        setSearch('');
        setFilterRole('');
        setFilterStatus('');
        setPage(1);
      }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search name, username, email..."
          style={{ maxWidth: '280px' }}
        />
        
        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          className="form-select form-select-sm"
          style={{ width: '160px', borderRadius: '8px', padding: '0.4rem 0.75rem' }}
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="form-select form-select-sm"
          style={{ width: '140px', borderRadius: '8px', padding: '0.4rem 0.75rem' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </FilterBar>

      {/* Base Table displaying users query list */}
      <BaseTable
        columns={tableColumns}
        data={usersResponse?.data || []}
        loading={isLoading || isFetching}
        pagination={usersResponse?.meta || null}
        onPageChange={setPage}
        onLimitChange={setLimit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(key, order) => {
          setSortBy(key);
          setSortOrder(order);
        }}
      />

      {/* User Creation / Edit Modal Overlay */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditMode ? 'Edit User Details' : 'Register New User'}
        size="md"
      >
        <BaseForm methods={methods} onSubmit={handleFormSubmit}>
          <div className="row">
            <div className="col-12 col-md-6">
              <FormInput name="firstname" label="First Name" placeholder="e.g. Shyam" required={true} />
            </div>
            <div className="col-12 col-md-6">
              <FormInput name="lastname" label="Last Name" placeholder="e.g. Kachhadiya" required={true} />
            </div>
          </div>

          <FormInput name="email" label="Email Address" type="email" placeholder="shyam@vendorbridge.com" required={true} />
          <FormInput name="phonenumber" label="Phone Number" placeholder="+91 9999999999" />
          <FormInput name="username" label="Username" placeholder="shyam_kb" required={true} />
          
          <FormSelect
            name="roleid"
            label="System Role"
            options={ROLE_OPTIONS}
            required={true}
          />

          {!isEditMode && (
            <FormInput
              name="password"
              label="Temporary Password"
              type="password"
              placeholder="Min. 6 characters"
              required={true}
            />
          )}

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="light" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              isLoading={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {isEditMode ? 'Save Profile' : 'Register'}
            </Button>
          </div>
        </BaseForm>
      </Modal>

      {/* Confirm Toggle status Dialog */}
      {selectedUser && (
        <ConfirmDialog
          isOpen={statusConfirmOpen}
          onClose={() => { setStatusConfirmOpen(false); setSelectedUser(null); }}
          onConfirm={() => {
            toggleStatusMutation.mutate({
              id: selectedUser.id,
              isactive: !selectedUser.isactive
            });
          }}
          title={selectedUser.isactive ? 'Deactivate User?' : 'Activate User?'}
          message={`Are you sure you want to ${selectedUser.isactive ? 'deactivate' : 'activate'} user account for ${selectedUser.firstname} ${selectedUser.lastname}?`}
          confirmText={selectedUser.isactive ? 'Yes, Deactivate' : 'Yes, Activate'}
          isDanger={selectedUser.isactive}
          isLoading={toggleStatusMutation.isPending}
        />
      )}

      {/* Force Password Reset Dialog */}
      {selectedUser && (
        <Modal
          isOpen={pwdResetOpen}
          onClose={() => {
            setPwdResetOpen(false);
            setSelectedUser(null);
            setResetPasswordVal('');
            setResetError('');
          }}
          title="Reset User Password"
          size="sm"
        >
          {resetError && <div className="alert alert-danger p-2 small">{resetError}</div>}
          <div className="mb-3">
            <label className="form-label">New Password for {selectedUser.username}</label>
            <input 
              type="password"
              value={resetPasswordVal}
              onChange={(e) => setResetPasswordVal(e.target.value)}
              placeholder="Enter new password"
              className="form-control"
            />
            <p className="text-muted small mt-2">
              Note: This action immediately resets the password and revokes all active session tokens for this user.
            </p>
          </div>
          
          <div className="d-flex justify-content-end gap-2 pt-2 border-top">
            <Button 
              variant="light" 
              onClick={() => {
                setPwdResetOpen(false);
                setSelectedUser(null);
                setResetPasswordVal('');
                setResetError('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (resetPasswordVal.length < 6) {
                  setResetError('Password must be at least 6 characters.');
                  return;
                }
                resetPasswordMutation.mutate({ id: selectedUser.id, password: resetPasswordVal });
              }}
              isLoading={resetPasswordMutation.isPending}
            >
              Reset Password
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Users;
