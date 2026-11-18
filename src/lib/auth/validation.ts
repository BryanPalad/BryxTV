import { z } from "zod";
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Use an email address under 255 characters.")
  .email("Enter a valid email address.");
export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters.")
  .max(60, "Use 60 characters or fewer.")
  .refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value),
    "Enter a valid display name.",
  );
const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, "Use at least 12 characters.")
  .max(MAX_PASSWORD_LENGTH, "Use 128 characters or fewer.");
export const registrationSchema = z
  .object({
    name: displayNameSchema,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
export const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(MAX_PASSWORD_LENGTH, "Use 128 characters or fewer."),
  rememberMe: z.boolean(),
});
export type RegistrationValues = z.infer<typeof registrationSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
