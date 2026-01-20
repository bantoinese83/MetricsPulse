import { useState, useCallback, useMemo } from 'react'

export interface ValidationRule<T = any> {
  validate: (value: T, formData?: Record<string, any>) => boolean
  message: string
  level?: 'error' | 'warning'
}

export interface FieldValidation<T = any> {
  value: T
  rules: ValidationRule<T>[]
  touched: boolean
  error?: string
  warning?: string
}

export interface FormValidationState {
  isValid: boolean
  isDirty: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
  touchedFields: Set<string>
}

export interface UseFormValidationOptions {
  validateOnChange?: boolean
  validateOnBlur?: boolean
  validateOnSubmit?: boolean
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, ValidationRule[]>,
  options: UseFormValidationOptions = {}
) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
  } = options

  const [values, setValues] = useState<T>(initialValues)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  // Validate a single field
  const validateField = useCallback((fieldName: keyof T, value: any = values[fieldName]) => {
    const rules = validationRules[fieldName]
    if (!rules) return { error: undefined, warning: undefined }

    for (const rule of rules) {
      const isValid = rule.validate(value, values)
      if (!isValid) {
        return {
          error: rule.level === 'warning' ? undefined : rule.message,
          warning: rule.level === 'warning' ? rule.message : undefined,
        }
      }
    }

    return { error: undefined, warning: undefined }
  }, [values, validationRules])

  // Validate all fields
  const validateAll = useCallback(() => {
    const errors: Record<string, string> = {}
    const warnings: Record<string, string> = {}

    Object.keys(validationRules).forEach(fieldName => {
      const { error, warning } = validateField(fieldName as keyof T)
      if (error) errors[fieldName] = error
      if (warning) warnings[fieldName] = warning
    })

    return { errors, warnings }
  }, [validateField, validationRules])

  // Update field value
  const setFieldValue = useCallback((fieldName: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }))

    if (validateOnChange) {
      // Mark field as touched
      setTouchedFields(prev => new Set(prev).add(fieldName as string))
    }
  }, [validateOnChange])

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName: keyof T) => {
    setTouchedFields(prev => new Set(prev).add(fieldName as string))
  }, [])

  // Handle field change
  const handleFieldChange = useCallback((fieldName: keyof T, value: any) => {
    setFieldValue(fieldName, value)
  }, [setFieldValue])

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues)
    setTouchedFields(new Set())
    setSubmitted(false)
  }, [initialValues])

  // Submit form
  const handleSubmit = useCallback((onSubmit: (values: T) => void | Promise<void>) => {
    return async (e?: React.FormEvent) => {
      e?.preventDefault()

      setSubmitted(true)
      setTouchedFields(new Set(Object.keys(validationRules)))

      const { errors } = validateAll()

      if (Object.keys(errors).length === 0) {
        await onSubmit(values)
      }
    }
  }, [values, validateAll, validationRules])

  // Computed validation state
  const validationState = useMemo((): FormValidationState => {
    const { errors, warnings } = validateAll()
    const isDirty = Object.keys(values).some(key =>
      values[key] !== initialValues[key]
    )

    return {
      isValid: Object.keys(errors).length === 0,
      isDirty,
      errors,
      warnings,
      touchedFields,
    }
  }, [values, initialValues, validateAll, touchedFields])

  // Get field error
  const getFieldError = useCallback((fieldName: keyof T): string | undefined => {
    if (!touchedFields.has(fieldName as string) && !submitted) return undefined
    const { error } = validateField(fieldName)
    return error
  }, [touchedFields, submitted, validateField])

  // Get field props for easy form binding
  const getFieldProps = useCallback((fieldName: keyof T) => ({
    value: values[fieldName],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      handleFieldChange(fieldName, e.target.value),
    onBlur: () => handleFieldBlur(fieldName),
    error: getFieldError(fieldName),
  }), [values, handleFieldChange, handleFieldBlur, getFieldError])

  return {
    values,
    setFieldValue,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    reset,
    getFieldError,
    getFieldProps,
    validationState,
    touchedFields,
    submitted,
  }
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value !== undefined && value !== null && value !== '',
    message,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule<string> => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || ''),
    message,
  }),

  minLength: (minLength: number, message?: string): ValidationRule<string> => ({
    validate: (value) => (value || '').length >= minLength,
    message: message || `Must be at least ${minLength} characters`,
  }),

  maxLength: (maxLength: number, message?: string): ValidationRule<string> => ({
    validate: (value) => (value || '').length <= maxLength,
    message: message || `Must be no more than ${maxLength} characters`,
  }),

  password: (message = 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return false
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)
    },
    message,
  }),

  match: (otherField: string, message?: string): ValidationRule<string> => ({
    validate: (value, formData) => value === formData?.[otherField],
    message: message || `Must match ${otherField}`,
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true // Allow empty values
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    },
    message,
  }),

  numeric: (message = 'Must be a valid number'): ValidationRule => ({
    validate: (value) => {
      if (value === undefined || value === null || value === '') return true
      return !isNaN(Number(value))
    },
    message,
  }),

  min: (minValue: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (value === undefined || value === null || value === '') return true
      return Number(value) >= minValue
    },
    message: message || `Must be at least ${minValue}`,
  }),

  max: (maxValue: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (value === undefined || value === null || value === '') return true
      return Number(value) <= maxValue
    },
    message: message || `Must be no more than ${maxValue}`,
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true
      return regex.test(value)
    },
    message,
  }),

  custom: <T,>(validator: (value: T, formData?: Record<string, any>) => boolean, message: string): ValidationRule<T> => ({
    validate: validator,
    message,
  }),
}

// Specialized hooks for common forms
export function useLoginForm(onSubmit: (data: { email: string; password: string }) => void | Promise<void>) {
  return useFormValidation(
    { email: '', password: '' },
    {
      email: [validationRules.required(), validationRules.email()],
      password: [validationRules.required()],
    },
    { validateOnChange: true, validateOnBlur: true }
  )
}

export function useSignupForm(onSubmit: (data: { email: string; password: string; confirmPassword: string }) => void | Promise<void>) {
  return useFormValidation(
    { email: '', password: '', confirmPassword: '' },
    {
      email: [validationRules.required(), validationRules.email()],
      password: [validationRules.required(), validationRules.password()],
      confirmPassword: [validationRules.required(), validationRules.match('password')],
    },
    { validateOnChange: true, validateOnBlur: true }
  )
}

export function useWorkspaceForm(onSubmit: (data: { name: string }) => void | Promise<void>) {
  return useFormValidation(
    { name: '' },
    {
      name: [validationRules.required(), validationRules.minLength(2), validationRules.maxLength(50)],
    },
    { validateOnChange: true, validateOnBlur: true }
  )
}