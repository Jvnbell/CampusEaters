export const allowedDomains = ['ut.edu', 'spartans.ut.edu'];

export const isAllowedEmail = (email: string) => {
  const [, domain = ''] = email.toLowerCase().split('@');

  return allowedDomains.includes(domain);
};


