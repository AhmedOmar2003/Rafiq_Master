const sourceFilesOnly = (files) =>
  files
    .filter((file) => !file.includes('public/app/'))
    .map((file) => `"${file}"`);

module.exports = {
  '*.{js,cjs,mjs,ts,tsx}': (files) => {
    const sourceFiles = sourceFilesOnly(files);
    return sourceFiles.length
      ? [`eslint --max-warnings=0 --fix ${sourceFiles.join(' ')}`]
      : [];
  },
};
