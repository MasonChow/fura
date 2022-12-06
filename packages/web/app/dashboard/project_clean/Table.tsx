'use client';

import { useMemo, useEffect, useRef } from 'react';

import useSelections from '../../../hooks/useSelections';

interface TableProps {
  data: any[];
}

async function delFiles(ids: string[]) {
  const res = await fetch('http://localhost:3000/api/del', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
  return res.json();
}

export default function Table({ data = [] }: TableProps) {
  const allCheckRef = useRef<HTMLInputElement>(null);

  const ids = useMemo(() => {
    return data.map((e) => e.id);
  }, [data]);

  const {
    selected,
    toggle,
    selectAll,
    allSelected,
    unSelectAll,
    partiallySelected,
  } = useSelections(ids);

  useEffect(() => {
    if (allCheckRef.current) {
      if (partiallySelected) {
        allCheckRef.current.indeterminate = true;
      } else {
        allCheckRef.current.indeterminate = false;
      }
    }
  }, [partiallySelected]);

  return (
    <div className="overflow-x-auto w-full">
      <table className="table w-full">
        <thead>
          <tr>
            <th>
              <label>
                <input
                  type="checkbox"
                  className="checkbox"
                  onChange={() => {
                    if (allSelected) {
                      unSelectAll();
                    } else {
                      selectAll();
                    }
                  }}
                  ref={allCheckRef}
                  checked={partiallySelected || allSelected}
                />
              </label>
            </th>
            <th>文件名/路径</th>
            <th>文件大小</th>
            <th className="text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            return (
              <tr
                key={item.id}
                className="cursor-pointer"
                onClick={() => {
                  toggle(item.id);
                }}
              >
                <th>
                  <label>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selected.includes(item.id)}
                      readOnly
                    />
                  </label>
                </th>
                <td>
                  {item.fileName} <br />{' '}
                  {item.path.replace(
                    '/Users/zhoushunming/Documents/sc/shopline-post-center',
                    '.',
                  )}
                </td>
                <td>{item.fileFormatSize}</td>
                <th>
                  <button
                    className="btn btn-outline btn-error"
                    onClick={(e) => {
                      e.stopPropagation();

                      delFiles([item.id]);
                    }}
                  >
                    删除
                  </button>
                </th>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
