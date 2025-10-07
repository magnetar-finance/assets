const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const { isAddress } = require('ethereum-address');

// const erc721DirectoryName = 'erc721';
const erc20DirectoryName = 'erc20';

const ERC20Schema = z.array(
  z
    .object({
      name: z.string(),
      symbol: z.string(),
      address: z.string().refine((arg) => isAddress(arg)),
      logoURI: z.union([z.string().url().min(1), z.string().base64().min(1)]),
      decimals: z
        .number()
        .int()
        .max(2 ** 8),
      chainId: z.number().int(),
    })
    .strict(),
);

function recursivePathTraversal(pth = __dirname, previousPaths = []) {
  const directories = fs.readdirSync(pth);
  let pathsToTraverse =
    previousPaths.indexOf(pth) !== -1
      ? previousPaths
      : previousPaths.concat(pth);

  for (const directory of directories) {
    // Build full path
    const fullPath = path.join(pth, directory);
    // Stat
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      pathsToTraverse.push(fullPath);
      recursivePathTraversal(fullPath, pathsToTraverse);
    } else pathsToTraverse.push(fullPath);
  }

  return pathsToTraverse;
}

function throwError(error) {
  console.error(error);
  process.exit(1);
}

function checkERC20() {
  const traversalResult = recursivePathTraversal();
  // Check for erc20 folder & index.json files
  const isValidFS = traversalResult.some(
    (result) =>
      result.toLowerCase().includes(erc20DirectoryName) &&
      result.includes('index.json'),
  );

  if (!isValidFS) throwError(new Error('Invalid folder structure'));
  else {
    // Find ERC20 file path

    traversalResult
      .filter(
        (result) =>
          result.toLowerCase().includes(erc20DirectoryName) &&
          result.includes('index.json'),
      )
      .forEach((erc20FilePath) => {
        // Read files
        const fileContent = fs.readFileSync(erc20FilePath);
        // Stringify and parse
        const erc20InfoObject = JSON.parse(fileContent.toString());
        console.info('Now running schema check for: %s', erc20FilePath);
        // Run schema check
        const { success, error } = ERC20Schema.safeParse(erc20InfoObject);

        if (!success) throwError(error);
      });
  }
}

function runCheck() {
  checkERC20();
}

runCheck();
