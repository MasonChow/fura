import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';

import DB from '../../lib/db';

// eslint-disable-next-line import/no-relative-packages
import data from '../../../../.fura/result.json';

const { fileDetail } = data;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'DELETE') {
    res.status(404).send(null);
    return;
  }

  let ids: string[] = [];

  try {
    ids = JSON.parse(req.body).ids;
    // console.log(typeof ids);
    if (!ids.length) {
      throw new Error('参数异常');
    }
  } catch (error) {
    res.status(400).send('参数错误');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  console.log(DB.client);

  await Promise.all(
    ids.map(async (id) => {
      try {
        const { path } = fileDetail[id];

        await fs.readFile(path);
        await fs.unlink(path);
        successCount += 0;
      } catch (error) {
        failCount += 1;
      }
    }),
  );

  res.status(200).json({
    success: successCount,
    fail: failCount,
  });
}
