

import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  AlertProps,
  Container,
  Grid,
  Paper,
  TableContainer,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import WithAuthentication from '../withAuthentication';
import { getSignups, markAttendance } from '../../helpers/firestore/signups';
import { Signup, SignupStatus } from '../../shared/signup';
import { SignupListTable } from './SignupListTable';
import { UserContext } from '../../helpers/UserContext';
import AdminTools from './AdminTools';
import { SCOPES } from '../../helpers/constants/i18n';
import SignupSummary from './SignupSummary';
import { isAdminOfEvent, isSuperAdmin } from '../../helpers/firestore/users';
import { EtiEventContext } from '../../helpers/EtiEventContext';
import { Unsubscribe } from 'firebase/firestore';

const SignupList = (props: { isAttendance: boolean }) => {
  const { user } = useContext(UserContext);
  const [signups, setSignups] = useState([] as Signup[]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { etiEvent } = useContext(EtiEventContext);
  const [alert, setAlert] = useState<{ props?: AlertProps; text?: string }>({});
  const { t } = useTranslation([SCOPES.MODULES.SIGN_UP_LIST, SCOPES.COMMON.FORM], {
    useSuspense: false
  });
  const isAdminOfThisEvent = isAdminOfEvent(user, etiEvent?.id);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  /** get signups */
  useEffect(() => {
    let unsubscribe: Unsubscribe;
    const fetchData = async () => {
      setIsLoading(true);
      if (etiEvent?.id) {
        unsubscribe = await getSignups(etiEvent.id, isAdminOfThisEvent, setSignups, setIsLoading);
      }
    };
    fetchData().catch((error) => {
      console.error(error);
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [etiEvent, isAdminOfThisEvent]);

  return (
    <>
      <WithAuthentication />
      <Container  disableGutters sx={{ marginTop: 3 , paddingLeft: 0 , paddingRight: 0 }}>
        <Grid container direction="column" spacing={3}>
          {!props.isAttendance ? (
            <Grid item>
              <SignupSummary signups={signups} />
            </Grid>
          ) : null}
          <Grid item>
            <Typography variant="h5" color="secondary" align="center">
              {t(props.isAttendance ? 'attendanceTitle' : 'title')}
            </Typography>
          </Grid>
          <Grid item>
            {alert.text && <Alert {...alert.props}>{alert.text}</Alert>}
            {isAdminOfThisEvent && etiEvent?.capacity && (
              <AdminTools
                selectedRows={selectedRows}
                etiEventId={etiEvent?.id!}
                signups={signups}
                setAlert={setAlert}
                capacity={etiEvent?.capacity!}
              />
            )}
          </Grid>
          <Grid item>
            <TableContainer
              component={Paper}
              sx={{
                width: '100%',
                overflowX: 'auto',
                padding: isSmallScreen ? '8px' : '16px',
                paddingLeft: 0, // Eliminar padding izquierdo
                paddingRight: 0 
              }}
            >
              <SignupListTable
                setSelectedRows={setSelectedRows}
                isAdmin={isAdminOfThisEvent}
                isSuperAdmin={isSuperAdmin(user)}
                etiEventId={etiEvent?.id!}
                signups={
                  props.isAttendance
                    ? signups.filter((s) => s.status === SignupStatus.CONFIRMED)
                    : signups
                }
                isLoading={isLoading}
                isAttendance={props.isAttendance}
                markAttendance={markAttendance}
                disabled={props.isAttendance && !isAdminOfThisEvent}
              />
            </TableContainer>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default SignupList;