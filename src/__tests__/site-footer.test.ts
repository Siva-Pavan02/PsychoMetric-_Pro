import { validateContact } from "@/app/site-footer";

describe("validateContact", () => {
  it("accepts a well-formed message", () => {
    expect(
      validateContact({ name: "Priya Sharma", email: "priya@example.com", message: "How long does the report take?" })
    ).toEqual({});
  });

  it("rejects a blank form on every field", () => {
    const errors = validateContact({ name: "", email: "", message: "" });
    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name"]);
  });

  it("trims before validating", () => {
    const errors = validateContact({ name: "  A  ", email: "  priya@example.com ", message: "   short   " });
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeUndefined();
    expect(errors.message).toBeDefined();
  });

  it("rejects malformed emails", () => {
    for (const email of ["priya", "priya@", "priya@example", "a b@example.com"]) {
      expect(validateContact({ name: "Priya", email, message: "A long enough message." }).email).toBeDefined();
    }
  });
});
