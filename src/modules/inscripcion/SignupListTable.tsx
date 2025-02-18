import React, { useState } from 'react';
import { Signup, SignupStatus } from 'shared/signup';
import { Button, Checkbox, Paper, useMediaQuery, useTheme, Box } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridFilterItem,
  GridRenderCellParams,
  GridSelectionModel
} from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { SCOPES } from '../../helpers/constants/i18n';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../App';
import { SearchBar } from '../../components/searchBar/SearchBar';
import { intersection } from 'lodash';
import { Alert } from '../../components/alert/Alert';

export type SignupField = keyof Signup;

function daysBetween(date1: Date, date2: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const time1 = date1.getTime();
  const time2 = date2.getTime();

  const dayDifference = Math.abs(time2 - time1) / msPerDay;

  return parseFloat(dayDifference.toFixed(1));
}

const getSignupHistoryEntry = (signup: Signup, status: SignupStatus) => {
  const output = signup?.statusHistory || [];
  return output?.reverse().find((e) => e.status === status);
};

const getDaysBetweenPayment = (signup: Signup) => {
  const pending = getSignupHistoryEntry(signup, SignupStatus.PAYMENT_PENDING)?.date;
  if (!pending) return 0;
  const paid = getSignupHistoryEntry(signup, SignupStatus.PAYMENT_TO_CONFIRM)?.date;
  return daysBetween(pending, paid || new Date());
};

export function SignupListTable(props: {
  etiEventId: string;
  signups: Signup[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  // eslint-disable-next-line no-unused-vars
  setSelectedRows: (selection: string[]) => void;
  isLoading: boolean;
  isAttendance: boolean;
  // eslint-disable-next-line no-unused-vars
  markAttendance: (signup: Signup) => void;
  disabled: boolean;
}) {
  const {
    etiEventId,
    signups,
    setSelectedRows,
    isAdmin,
    isSuperAdmin,
    isLoading,
    isAttendance,
    markAttendance,
    
  } = props;
  const navigate = useNavigate();
  const [filteredRows, setFilteredRows] = useState<GridFilterItem[]>([]);
  const [attendanceConfirmationAlertVisible, setAttendanceConfirmationAlertVisible] =
    useState<boolean>(false);
  const [attendanceConfirmationRow, setAttendanceConfirmationRow] = useState<Signup | null>(null);

  const filterRows = (value: string, columnField: string) => {
    setFilteredRows([
      {
        columnField,
        operatorValue: 'contains',
        value
      }
    ]);
  };

  const attendanceFields: SignupField[] = [
    'nameFirst',
    'nameLast',
    'dniNumber',
    'food',
    'isCeliac',
    'disability',
    'phoneNumber'
  ];

  const publicFields: SignupField[] = [
    'orderNumber',
    'nameFirst',
    'nameLast',
    'country',
    'province',
    'city',
    'status',
    'lastModifiedAt'
  ];

  const privateFields: SignupField[] = [
    'dateArrival',
    'dateDeparture',
    'email',
    'dniNumber',
    'helpWith',
    'food',
    'isCeliac',
    'phoneNumber',
    'disability',
    'wantsLodging',
    // @ts-ignore
    'daysBetweenPayment'
  ];

  const searchableFields: SignupField[] = [
    'nameFirst',
    'nameLast',
    'country',
    'province',
    'city',
    'status',
    'dniNumber'
  ];

  function getFields() {
    if (isAttendance) {
      return attendanceFields;
    }

    return isAdmin || isSuperAdmin ? [...publicFields, ...privateFields] : publicFields;
  }

  function getFilterFields() {
    if (isAttendance) {
      return intersection(searchableFields, attendanceFields);
    }

    return isAdmin || isSuperAdmin ? [...publicFields, ...privateFields] : publicFields;
  }

  const { t } = useTranslation([SCOPES.COMMON.FORM, SCOPES.MODULES.SIGN_UP_LIST], {
    useSuspense: false
  });
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const columns: GridColDef[] = getFields().map((fieldName) => ({
    field: fieldName,
    headerName: t(fieldName),
    width: isSmallScreen ? 100 : fieldName === 'email' ? 300 : 150,
    hide: isSmallScreen && !['nameFirst', 'nameLast', 'status'].includes(fieldName)
  }));

  const sentEmailButton = {
    field: 'mails',
    headerName: 'Historial de Mails',
    width: 200,
    renderCell: (params: GridRenderCellParams<String>) => (
      <strong>
        <Button
          variant="contained"
          size="small"
          style={{ marginLeft: 16 }}
          tabIndex={params.hasFocus ? 0 : -1}
          onClick={() =>
            navigate(
              `${ROUTES.SUPERADMIN + ROUTES.SENT_MAILS}/${etiEventId}?usermail=${params.row.email}`
            )
          }
        >
          Ver Mails Enviados
        </Button>
      </strong>
    )
  };

  const viewBankButton = {
    field: 'bank',
    headerName: 'Datos Bancarios',
    width: 200,
    renderCell: (params: GridRenderCellParams<String>) => (
      <strong>
        <Button
          variant="contained"
          size="small"
          style={{ marginLeft: 16 }}
          tabIndex={params.hasFocus ? 0 : -1}
          onClick={() => navigate(`${ROUTES.BANKS}/${params.row.userId}`)}
        >
          Ver Datos Bancarios
        </Button>
      </strong>
    )
  };

  const viewReceiptButton = {
    field: 'receipt',
    headerName: t('receipt'),
    width: 250,
    renderCell: (params: GridRenderCellParams<String>) => (
      <strong>
        <Button
          variant="contained"
          size="small"
          style={{ marginLeft: 16 }}
          tabIndex={params.hasFocus ? 0 : -1}
          onClick={() => navigate(`${ROUTES.RECEIPTS}/${params.row.etiEventId}/${params.row.id}`)}
          disabled={!params.row.receipt}
        >
          {t('receiptButton')}
        </Button>
      </strong>
    )
  };

  if (isSuperAdmin) {
    columns.push(sentEmailButton);
  }

  if (isAdmin && !isAttendance) {
    columns.push(viewBankButton);
    columns.unshift(viewReceiptButton);
  }

  const attendanceCheckbox = {
    field: 'didAttend',
    headerName: 'Presente',
    renderCell: (params: GridRenderCellParams) => (
      <Checkbox
        checked={!!params.row.didAttend}
        disabled={!!params.row.didAttend || props.disabled}
        onChange={() => askForAttendanceConfirmation(params)}
        inputProps={{ 'aria-label': 'controlled' }}
      />
    )
  };
  if (isAttendance) {
    columns.push(attendanceCheckbox);
  }
  const getSignupValues = (signup: Signup) => {
    let output: any = { ...signup };
    const dateFields: (keyof Signup)[] = ['dateArrival', 'dateDeparture', 'lastModifiedAt'];
    dateFields.forEach((field) => {
      if (signup[field]) {
        output[field] = (signup[field]! as Date).toLocaleDateString()!;
      }
    });
    const translatableFields: ('helpWith' | 'food' | 'status')[] = ['helpWith', 'food', 'status'];
    translatableFields.forEach((field) => {
      if (signup[field]) {
        output[field] = t(signup[field] as string);
      }
    });
    if (!signup.isCeliac) {
      output.isCeliac = t('no');
    } else {
      output.isCeliac = t('yes');
    }

    if (!signup.wantsLodging) {
      output.wantsLodging = t('no');
    } else {
      output.wantsLodging = t('yes');
    }

    output.daysBetweenPayment = getDaysBetweenPayment(signup);
    return output;
  };

  function selectionChanged(selection: GridSelectionModel) {
    setSelectedRows(selection.map((id) => id as string));
  }

  const askForAttendanceConfirmation = (confirmationRowParams: GridRenderCellParams) => {
    setAttendanceConfirmationRow(confirmationRowParams.row);
    setAttendanceConfirmationAlertVisible(true);
  };

  const getFullName = (user: Signup | null) => (user ? `${user.nameFirst} ${user.nameLast}` : '');

  return (
    <>
      <Alert
        open={attendanceConfirmationAlertVisible}
        handleClose={() => {
          setAttendanceConfirmationAlertVisible(false);
          setAttendanceConfirmationRow(null);
        }}
        onClick={() => {
          setAttendanceConfirmationAlertVisible(false);
          if (attendanceConfirmationRow) {
            markAttendance(attendanceConfirmationRow);
            setAttendanceConfirmationRow(null);
          }
        }}
        buttonText={t('alert.confirm', { ns: SCOPES.MODULES.SIGN_UP_LIST }).toUpperCase()}
        title={t('alert.title', { ns: SCOPES.MODULES.SIGN_UP_LIST })}
        description={t('alert.description', {
          ns: SCOPES.MODULES.SIGN_UP_LIST,
          fullName: getFullName(attendanceConfirmationRow)
        })}
        cancelButtonText={t('alert.cancel', { ns: SCOPES.MODULES.SIGN_UP_LIST }).toUpperCase()}
      />
      <Paper sx={{
        height: '100vh',
        marginTop: 3,
        padding: isSmallScreen ? '8px' : '16px',
        overflow: 'auto',
        
      }}>
        <SearchBar setQuery={filterRows} fields={getFilterFields()} />
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
  <DataGrid
    rows={signups.map(getSignupValues)}
    columns={columns}
    checkboxSelection={isAdmin && !isAttendance}
    onSelectionModelChange={selectionChanged}
    loading={isLoading}
    filterModel={{ items: filteredRows }}
    autoHeight
    sx={{
      '& .MuiDataGrid-root': {
        border: 'none',
      },
      '& .MuiDataGrid-cell': {
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        fontSize: isSmallScreen ? '0.75rem' : '1rem',
      },
      '& .MuiDataGrid-columnHeaders': {
        backgroundColor: theme.palette.background.paper,
      },
      '& .MuiDataGrid-columnHeaderTitle': {
        fontWeight: 'bold',
        fontSize: isSmallScreen ? '0.75rem' : '1rem',
      },
    }}
  />
</Box>
      </Paper>
    </>
  );
}