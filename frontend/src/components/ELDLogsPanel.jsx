import React from 'react';
import ELDLogSheet from './ELDLogSheet';

const ELDLogsPanel = ({ dayLogs, summary, singleView = false }) => {
  return (
    <div className={`space-y-6 ${singleView ? '' : 'mt-8'}`}>
      {dayLogs.map((log, i) => (
        <ELDLogSheet key={i} logData={log} dayIndex={i} summary={summary} />
      ))}
    </div>
  );
};

export default ELDLogsPanel;
