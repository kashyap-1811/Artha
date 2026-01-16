import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  return <h1>Welcome {user?.name}</h1>;
};

export default Dashboard;
