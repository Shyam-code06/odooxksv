import React from 'react';
import { useFormContext } from 'react-hook-form';
import Input from '../Input';

const FormInput = ({ name, validationRules = {}, ...props }) => {
  const { register, formState: { errors } } = useFormContext();

  // Resolve nested errors if name contains dots (e.g. profile.firstname)
  const getNestedError = (fieldName) => {
    return fieldName.split('.').reduce((obj, key) => obj?.[key], errors);
  };

  const error = getNestedError(name);

  return (
    <Input
      name={name}
      error={error}
      {...register(name, validationRules)}
      {...props}
    />
  );
};

export default FormInput;
