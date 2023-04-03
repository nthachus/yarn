const PKG_INPUT = /(^\S?[^\s@]+)(?:@(\S+))?$/;

export default function parsePackageName(input) {
  const [, name, version] = PKG_INPUT.exec(input);
  return {name, version};
}
