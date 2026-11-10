import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router"

import Home from "./components/home/Home";
import Register from './components/user/Register'
import Login from "./components/user/Login";

import './App.css'

function App() {
    const [user, setUser] = useState<{ id: string, username: string, display_name: string, created_at: Date } | null>(null);

    useEffect(
        () => {
            fetch(
                'http://localhost:3000/users/me',
                {
                    "method": "GET",
                    "credentials": "include"
                }
            )
                .then(
                    (Data) => {
                        Data.json().then(
                            (Response) => {
                                if (!Data.ok) throw new Error(Response.error.message);
                                setUser(Response.data);
                            }
                        )
                    }
                )
                .catch(
                    (Error) => {
                        console.error(Error);
                        setUser(null);
                    }
                );
            return () => {};
        },
        []
    );

    return (
        <>
            <Routes>
                <Route index element={<Home user={user!}></Home>}></Route>

                <Route path="login" element={<Login></Login>}></Route>
                <Route path="register" element={<Register></Register>}></Route>
            </Routes>
        </>
    );
}

export default App;