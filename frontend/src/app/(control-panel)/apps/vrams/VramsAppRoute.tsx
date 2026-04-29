import { Navigate } from 'react-router';
import { FuseRouteItemType } from '@fuse/utils/FuseUtils';
import useUser from '@auth/useUser';
import VramsLayout from './VramsLayout';
import VramsDashboard from './dashboard/VramsDashboard';
import VramsRequests from './requests/VramsRequests';
import VramsMaintenance from './maintenance/VramsMaintenance';
import VramsVehicles from './vehicles/VramsVehicles';
import VehicleProfile from './vehicles/profile/VehicleProfile';
import VehicleRegister from './vehicles/register/VehicleRegister';
import VramsDispatch from './dispatch/VramsDispatch';
import VramsSettings from './settings/VramsSettings';
import VramsMap from './map/VramsMap';
import VramsSearch from './search/VramsSearch';
import VramsDrivers from './drivers/VramsDrivers';

function VramsRoleHome() {
	const { data: user } = useUser();
	const role = Array.isArray(user?.role) ? user?.role[0] : user?.role;

	if (role === 'driver') {
		return <Navigate to="/apps/vrams/map" replace />;
	}

	if (role === 'requester') {
		return <Navigate to="/apps/vrams/requests" replace />;
	}

	return <Navigate to="/apps/vrams/dashboard" replace />;
}

const VramsAppRoute: FuseRouteItemType = {
	path: 'apps/vrams',
	element: <VramsLayout />,
	children: [
		{ path: '', element: <VramsRoleHome /> },
		{ path: 'dashboard', element: <VramsDashboard /> },
		{ path: 'requests', element: <VramsRequests /> },
		{ path: 'maintenance', element: <VramsMaintenance /> },
		{
			path: 'vehicles',
			children: [
				{ path: '', element: <VramsVehicles /> },
				{ path: 'register', element: <VehicleRegister /> },
				{ path: ':vehicleId', element: <VehicleProfile /> }
			]
		},
		{ path: 'drivers', element: <VramsDrivers /> },
		{ path: 'dispatch', element: <VramsDispatch /> },
		{ path: 'map', element: <VramsMap /> },
		{ path: 'search', element: <VramsSearch /> },
		{ path: 'settings', element: <VramsSettings /> }
	]
};

export default VramsAppRoute;
