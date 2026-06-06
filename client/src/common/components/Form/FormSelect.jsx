import React from 'react';
import { useFormContext } from 'react-hook-form';
import Select from '../Select';

const FormSelect = ({ name, validationRules = {}, ...props }) => {
  const { register, formState: { errors } } = useFormContext();

  const getNestedError = (fieldName) => {
    return fieldName.split('.').reduce((obj, key) => obj?.[key], errors);
  };

  const error = getNestedError(name);

  return (
    <Select
      name={name}
      error={error}
      {...register(name, validationRules)}
      {...props}
    />
  );
};

export default FormSelect;
