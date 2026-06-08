const PASSWORD_REQUIREMENTS =
  "كلمة المرور لازم تكون ٨ أحرف على الأقل، وفيها حرف كبير وصغير ورقم ورمز.";

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[#?!@$%^&*_.-]/.test(password)
  );
}

export function passwordRequirementMessage(): string {
  return PASSWORD_REQUIREMENTS;
}
