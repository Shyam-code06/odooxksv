import React from 'react';
import { useFormContext } from 'react-hook-form';
import Textarea from '../Textarea';

const FormTextarea = ({ name, validationRules = {}, ...props }) => {
  const { register, formState: { errors } } = useFormContext();

  const getNestedError = (fieldName) => {
    return fieldName.split('.').reduce((obj, key) => obj?.[key], errors);
  };

  const error = getNestedError(name);

  return (
    <Textarea
      name={name}
      error={error}
      {...register(name, validationRules)}
      {...props}
    />
  );
};

// Wait, the return statement calls FormTextarea recursively! This is a bug! It should call Textarea primitive!
// Let's fix this in the code content! 
// Understood, the component imports Textarea from '../Textarea', so the return should be <Textarea ... />.
