function Register() {
    const Register = async (Event: any) => {
        Event.preventDefault();
        
        const RegisterData = new FormData(Event.target);

        await fetch(
            'http://localhost:3000/users/register',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        username: RegisterData.get('username'),
                        display_name: RegisterData.get('display_name'),
                        password: RegisterData.get('password')
                    }
                )
            }
        )
            .then(
                (Data) => {
                    return Data.json().then(
                        (Response) => {
                            if (!Data.ok) throw new Error(Response.Error || 'Error');
                            return Response;
                        }
                    );
                }
            )
            .catch(
                (Error) => {
                    console.error(Error);
                }
            );
    };

    return (
        <div>
            <form onSubmit={Register}>
                <input name="username"></input> <br />
                <input name="display_name"></input> <br />
                <input name="password" type="password"></input> <br />
                <input name="confirm-password" type="password"></input> <br />
                <button type="submit">Submit</button> <br />
            </form>
        </div>
    );
}

export default Register;