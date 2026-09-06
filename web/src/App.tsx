import { Routes, Route } from "react-router"

import Register from './components/user/Register'
import Login from "./components/user/Login";

import './App.css'

async function App() {
    return (
        <>
            <Routes>
                <Route index element={<>Home</>}></Route>

                <Route path="login" element={<Login></Login>}></Route>
                <Route path="register" element={<Register></Register>}></Route>
            </Routes>
        </>
    );
}

export default App;