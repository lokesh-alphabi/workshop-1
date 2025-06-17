import { describe, it, expect } from "@jest/globals";
import {
  UserRoleSchema,
  ProjectRoleSchema,
  CreateUserSchema,
  LoginSchema,
  EmailSchema,
  UpdateUserSchema,
} from "../auth";

describe("Authentication Validation Schemas", () => {
  describe("UserRoleSchema", () => {
    it("should accept valid user roles", () => {
      expect(UserRoleSchema.parse("ROOT_ADMIN")).toBe("ROOT_ADMIN");
      expect(UserRoleSchema.parse("ADMIN")).toBe("ADMIN");
      expect(UserRoleSchema.parse("EMPLOYEE")).toBe("EMPLOYEE");
    });

    it("should reject invalid user roles", () => {
      expect(() => UserRoleSchema.parse("INVALID_ROLE")).toThrow();
      expect(() => UserRoleSchema.parse("manager")).toThrow();
      expect(() => UserRoleSchema.parse("")).toThrow();
    });
  });

  describe("ProjectRoleSchema", () => {
    it("should accept valid project roles", () => {
      expect(ProjectRoleSchema.parse("OWNER")).toBe("OWNER");
      expect(ProjectRoleSchema.parse("MANAGER")).toBe("MANAGER");
      expect(ProjectRoleSchema.parse("DEVELOPER")).toBe("DEVELOPER");
      expect(ProjectRoleSchema.parse("TESTER")).toBe("TESTER");
    });

    it("should reject invalid project roles", () => {
      expect(() => ProjectRoleSchema.parse("ADMIN")).toThrow();
      expect(() => ProjectRoleSchema.parse("owner")).toThrow();
      expect(() => ProjectRoleSchema.parse("")).toThrow();
    });
  });

  describe("EmailSchema", () => {
    it("should accept valid email addresses", () => {
      expect(EmailSchema.parse("test@example.com")).toBe("test@example.com");
      expect(EmailSchema.parse("user.name+tag@domain.co.uk")).toBe(
        "user.name+tag@domain.co.uk"
      );
      expect(EmailSchema.parse("UPPERCASE@EXAMPLE.COM")).toBe(
        "uppercase@example.com"
      );
    });

    it("should reject invalid email addresses", () => {
      expect(() => EmailSchema.parse("invalid-email")).toThrow();
      expect(() => EmailSchema.parse("@domain.com")).toThrow();
      expect(() => EmailSchema.parse("user@")).toThrow();
      expect(() => EmailSchema.parse("")).toThrow();
    });

    it("should trim and lowercase email addresses", () => {
      expect(EmailSchema.parse("  Test@Example.Com  ")).toBe(
        "test@example.com"
      );
    });
  });

  describe("LoginSchema", () => {
    it("should accept valid login credentials", () => {
      const validLogin = {
        email: "test@example.com",
        password: "password123",
      };
      expect(LoginSchema.parse(validLogin)).toEqual({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should reject missing email", () => {
      const invalidLogin = {
        password: "password123",
      };
      expect(() => LoginSchema.parse(invalidLogin)).toThrow();
    });

    it("should reject missing password", () => {
      const invalidLogin = {
        email: "test@example.com",
      };
      expect(() => LoginSchema.parse(invalidLogin)).toThrow();
    });

    it("should reject invalid email format", () => {
      const invalidLogin = {
        email: "invalid-email",
        password: "password123",
      };
      expect(() => LoginSchema.parse(invalidLogin)).toThrow();
    });
  });

  describe("CreateUserSchema", () => {
    it("should accept valid user creation data", () => {
      const validUser = {
        email: "newuser@example.com",
        name: "John Doe",
        role: "EMPLOYEE" as const,
        password: "SecurePass123!",
      };
      expect(CreateUserSchema.parse(validUser)).toEqual({
        email: "newuser@example.com",
        name: "John Doe",
        role: "EMPLOYEE",
        password: "SecurePass123!",
      });
    });

    it("should reject weak passwords", () => {
      const userData = {
        email: "test@example.com",
        name: "Test User",
        role: "EMPLOYEE" as const,
        password: "weak",
      };
      expect(() => CreateUserSchema.parse(userData)).toThrow();
    });

    it("should reject passwords without special characters", () => {
      const userData = {
        email: "test@example.com",
        name: "Test User",
        role: "EMPLOYEE" as const,
        password: "NoSpecialChar123",
      };
      expect(() => CreateUserSchema.parse(userData)).toThrow();
    });

    it("should reject passwords without uppercase letters", () => {
      const userData = {
        email: "test@example.com",
        name: "Test User",
        role: "EMPLOYEE" as const,
        password: "nouppercase123!",
      };
      expect(() => CreateUserSchema.parse(userData)).toThrow();
    });

    it("should reject empty or whitespace-only names", () => {
      const userData = {
        email: "test@example.com",
        name: "   ",
        role: "EMPLOYEE" as const,
        password: "SecurePass123!",
      };
      expect(() => CreateUserSchema.parse(userData)).toThrow();
    });

    it("should trim names", () => {
      const userData = {
        email: "test@example.com",
        name: "  John Doe  ",
        role: "EMPLOYEE" as const,
        password: "SecurePass123!",
      };
      const result = CreateUserSchema.parse(userData);
      expect(result.name).toBe("John Doe");
    });
  });

  describe("UpdateUserSchema", () => {
    it("should accept valid updates", () => {
      const validUpdate = {
        name: "Updated Name",
        role: "ADMIN" as const,
      };
      expect(UpdateUserSchema.parse(validUpdate)).toEqual(validUpdate);
    });

    it("should accept partial updates", () => {
      const nameOnlyUpdate = { name: "New Name" };
      expect(UpdateUserSchema.parse(nameOnlyUpdate)).toEqual(nameOnlyUpdate);

      const roleOnlyUpdate = { role: "ADMIN" as const };
      expect(UpdateUserSchema.parse(roleOnlyUpdate)).toEqual(roleOnlyUpdate);
    });

    it("should reject empty updates", () => {
      expect(() => UpdateUserSchema.parse({})).toThrow();
    });

    it("should trim names in updates", () => {
      const updateData = { name: "  Trimmed Name  " };
      const result = UpdateUserSchema.parse(updateData);
      expect(result.name).toBe("Trimmed Name");
    });
  });
});
