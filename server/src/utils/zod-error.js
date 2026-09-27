export const getZodFieldErrors = (error) => {
  const issues = error.issues || [];
  const fieldErrors = {};

  for (const issue of issues) {
    const fieldName = issue.path.join(".");
    if (!fieldErrors[fieldName]) {
      fieldErrors[fieldName] = issue.message;
    }
  }

  return fieldErrors;
};
