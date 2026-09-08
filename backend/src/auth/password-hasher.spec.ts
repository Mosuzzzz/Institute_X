import { PasswordHasher } from './password-hasher';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('stores a salted scrypt hash and verifies it', async () => {
    const hash = await hasher.hash('correct horse battery staple');
    expect(hash).not.toContain('correct horse battery staple');
    expect(hash).toMatch(/^scrypt\$/);
    await expect(hasher.verify('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(hasher.verify('wrong password', hash)).resolves.toBe(false);
  });
});
