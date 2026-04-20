import { Navigate } from 'react-router';
import { FuseRouteItemType } from '@fuse/utils/FuseUtils';
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

const VramsAppRoute: FuseRouteItemType = {
	path: 'apps/vrams',
	element: <VramsLayout />,
	children: [
		{ path: '', element: <Navigate to="dashboard" /> },
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
		{ path: 'dispatch', element: <VramsDispatch /> },
		{ path: 'map', element: <VramsMap /> },
		{ path: 'settings', element: <VramsSettings /> }
	]
};

export default VramsAppRoute;
