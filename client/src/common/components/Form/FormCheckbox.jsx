import React from 'react';
import { useFormContext } from 'react-hook-form';
import Checkbox from '../Checkbox';

const FormCheckbox = ({ name, validationRules = {}, ...props }) => {
  const { register, formState: { errors } } = useFormContext();

  const getNestedError = (fieldName) => {
    return fieldName.split('.').reduce((obj, key) => obj?.[key], errors);
  };

  const error = getNestedError(name);

  return (
    <Checkbox
      name={name}
      error={error}
      {...register(name, validationRules)}
      {...props}
    />
  );
};

export default FormCheckbox;
