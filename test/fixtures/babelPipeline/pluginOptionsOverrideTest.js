type Foo = number

let person = { score: 25 }

let newScore = person.score |> double(#) |> add(7, #) |> boundScore(0, 100, #)

newScore //=> 57
