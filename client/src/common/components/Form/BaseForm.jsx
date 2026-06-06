import React from 'react';
import { FormProvider } from 'react-hook-form';

const BaseForm = ({
  methods,
  onSubmit,
  className = '',
  children,
  ...props
}) => {
  return (
    <FormProvider {...methods}>
      <form 
        onSubmit={methods.handleSubmit(onSubmit)} 
        className={className} 
        {...props}
      >
        {children}
      </form>
    </FormProvider>
  );
};

export default BaseForm;
