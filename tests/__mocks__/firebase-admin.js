const mockVerifyIdToken = jest.fn().mockImplementation(async (token) => {
  if (token === 'invalid_token') {
    const err = new Error('Invalid token');
    err.codePrefix = 'auth';
    err.code = 'auth/id-token-expired';
    throw err;
  }
  if (token === 'expired_token') {
    const err = new Error('Token expired');
    err.codePrefix = 'auth';
    err.code = 'auth/id-token-expired';
    throw err;
  }
  return { uid: 'mock_uid', phone_number: '+1234567890' };
});
const mockSend = jest.fn().mockResolvedValue('mock-message-id');

const mockAuth = () => ({
  verifyIdToken: mockVerifyIdToken,
});

const mockMessaging = () => ({
  send: mockSend,
});

const mockInitializeApp = jest.fn();
const mockCert = jest.fn();
const mockGetApps = jest.fn().mockReturnValue([]);

module.exports = {
  initializeApp: mockInitializeApp,
  cert: mockCert,
  getApps: mockGetApps,
  getAuth: mockAuth,
  getMessaging: mockMessaging,
  __mocks: {
    verifyIdToken: mockVerifyIdToken,
    send: mockSend,
  },
};
