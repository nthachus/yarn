function getUid() {
  if (process.platform !== 'win32' && process.getuid) {
    return process.getuid();
  }
  return null;
}

export default isRootUser(getUid()) && !isFakeRoot();

export function isFakeRoot() {
  return Boolean(process.env.FAKEROOTKEY);
}

export function isRootUser(uid) {
  return uid === 0;
}
