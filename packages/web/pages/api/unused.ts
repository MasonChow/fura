// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
// import type { NextRequest } from 'next/server';

// eslint-disable-next-line import/no-relative-packages
import data from '../../../../.fura/result.json';

export const config = {
  runtime: 'experimental-edge',
};

export default async function handler() {
  const { fileDetail } = data;
  const res: Array<any> = [];

  Object.entries(fileDetail).forEach(([, val]) => {
    if (val.isUnused) {
      res.push(val);
    }
  });

  return new Response(JSON.stringify(res), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  });
}
