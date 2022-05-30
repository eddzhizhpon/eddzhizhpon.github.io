---
layout: default
---

## Documentación

***

<details markdown=1>
<summary markdown="span" class="detail-title">
Introducción a SystemC
</summary>

### A. Hola Mundo con SystemC
Los elementos fundamentales para construir un programa con SystemC, son tres.

1. **El archivo de cabecera (header file):** Un header file contiene la declaración directa de elementos de código, tales como: clases, variables, subrutinas, entre otros. En este caso, para utilizar cualquier funcionalidad de SystemC, se debe incluir uno de los siguientes header files:

    - `#include <systemc.h>`
    Versión nueva del header file, el cuál incluye todo de los namespaces: `sc_core` y `sc_dt`.

    - `#include <systemc>`
    Versión antigua del header file. Si se usa, a continuación se debe definir el namespace `sc_core`.

2. **El punto de entrada:** En C++, el punto de entrada al programa es la función `main()`, sin embargo SystemC define su propia función, la cual es `int sc_main(int arg, char* argv[])`{:.cpp}.


3. **El módulo:** Un módulo, en el contexto de SystemC, es la estructura base para la construcción de cualquier proceso de simulación. En la siguiente sección se profundizará este concepto.

**A continuación, se mostrará el código para obtener un "Hola Mundo":**

```cpp
#include "systemc.h"

struct HelloWorld : sc_module
{
  SC_CTOR(HelloWorld)
  {
    SC_METHOD(hello);
  }

  void hello(void)
  {
    std::cout << "Hola mundo desde SystemC" << std::endl;
  }
};

int sc_main(int, char *[])
{
  HelloWorld helloworld("helloworld");
  sc_start();
  return 0;
}
```

### B. Módulo
Un módulo de SystemC es el principal elemento para representar un componente de un sistema real, el cual tiene un estado, comportamiento y una estructura definida para permitir la comunicación con otros módulos.

Para definir un módulo, se pueden usar tres diferentes enfoques:
<ol>
<li markdown=1>

**Usando el macro SC_MODULE**

```cpp
#include "systemc.h"

SC_MODULE(MODULE_A)
{
  SC_CTOR(MODULE_A)
  {
    std::cout << "Constructor de " << name() << std::endl;
  }
};

int sc_main(int, char *[])
{
  MODULE_A module_a("module_a");
  sc_start();
  return 0;
}
```
</li>
<li markdown=1>

**Usando structure:**

```cpp
#include "systemc.h"

struct MODULE_B : public sc_module
{
  SC_CTOR(MODULE_B)
  {
    std::cout << "Constructor de " << name() << std::endl;
  }
};

int sc_main(int, char *[])
{
  MODULE_B module_b("module_b");
  sc_start();
  return 0;
}
```
</li>
<li markdown=1>

**Usando class:**

```cpp
#include "systemc.h"

class MODULE_C : public sc_module
{
public:
  SC_CTOR(MODULE_C)
  {
    std::cout << "Constructor de " << name() << std::endl;
  }
};

int sc_main(int, char *[])
{
  MODULE_C module_c("module_c");
  sc_start();
  return 0;
}
```

</li>
</ol>


### C. Constructor
Todo módulo de SystemC debe tener un nombre único, y esto se logra a través de los constructores. Para esto, SystemC proporciona un macro `SC_CTOR`, el cuál declara un constructor con un solo argumento, que es el nombre del módulo: `sc_module_name`.

Si se requiere pasar más de un argumento, se debe definir un constructor explícito.

**Ejemplo del uso del Constructor**

```cpp
#include "systemc.h"

SC_MODULE(MODULE_A)
{
  const int i;

  SC_CTOR(MODULE_A);

  MODULE_A(sc_module_name name, int i) : sc_module(name), i(i)
  {
    SC_METHOD(func_a);
  }

  void func_a()
  {
    std::cout << name() << ", i = " << i << std::endl;
  }
};

int sc_main(int, char *[])
{
  MODULE_A module_a("module_a", 10);

  sc_start();
  return 0;
}
```

### D. Notación de Tiempo
Uno de los elementos principales que componen una simulación, es el tiempo. Para representar el tiempo, en SystemC se tiene la clase `sc_time`, la que recibe dos argumentos: un valor numérico y una unidad de tiempo.

Las unidades de tiempo disponibles, son:
  * `SC_SEC`: 1 segundo
  * `SC_MS`: 10<sup>−3</sup> segundos
  * `SC_US`: 10<sup>−6</sup> segundos
  * `SC_NS`: 10<sup>−9</sup> segundos
  * `SC_PS`: 10<sup>−12</sup> segundos
  * `SC_FS`: 10<sup>−15</sup> segundos


**Ejemplo:**

```cpp
#include "systemc.h"

int sc_main(int, char *[])
{
  sc_time time_sec(1, SC_SEC);
  sc_time time_ms(1000, SC_MS);

  std::cout << "Un segundo: " << time_sec << std::endl;
  std::cout << "Mil milisegundos: " << time_ms << std::endl;

  return 0;
}
```

</details>

***

<details markdown=1>
<summary markdown="span" class="detail-title">
Simulación
</summary>

### A. Procesos

Características de un proceso:
1. Pertenece a la clase `sc_module`.
1. No tiene un argumento de entrada o retorno de valores.
1. Es registrado con el kernel `simulation`.

Para el registro de un Proceso de Simulación, se puede realizar con los siguientes métodos:
1. `SC_METHOD(func)`: no tiene un hilo de ejecución propio, no consume tiempo simulado, no se puede suspender y no se puede llamar a la función `wait()`.
1. `SC_THREAD(func)`: tiene su propio hilo de ejecución, puede consumir tiempo simulado, puede ser suspendido y puede llamar a la función `wait()`.
1. `SC_CTHREAD(func, event)`: es una función especial de `SC_THREAD`, con la diferencia de que este método se activa cada vez que ocurra el borde de reloj especificado.

¿Cuándo puede realizarse un registro?
1. En el cuerpo del Constructor.
1. En los callbacks `before_end_of_elaboration` o `end_of_elaboration`.
1. Desde una función llamada desde el Constructor o callbacks.

Restricciones:
1. Los registros solo pueden ser establecidos en funciones del mismo módulo.
1. `SC_CTHREAD` no debe ser invocado desde el callback `end_of_elaboration`.

Notas:
1. `SC_THREAD` puede hacer todo lo que `SC_METHOD` y `SC_CHTEAD`. Por lo que es el más utilizado en esta biblioteca.
1. `SC_THREAD` no requiere de un bucle `while`, ya que puede ser llamado por `next_trigger()`.

**Ejemplo de la Simulación por Procesos**

```cpp
#include "systemc.h"

SC_MODULE(PROCESS)
{
  // Declaración de reloj
  sc_clock clk;
  SC_CTOR(PROCESS) : clk("clk", 1, SC_SEC)
  {
    // Registro para SC_METHOD
    SC_METHOD(method);
    // Registro de un hilo
    SC_THREAD(thread);
    // Registro de un hilo con reloj
    SC_CTHREAD(cthread, clk);
  }
  // Definición de la Función para SC_METHOD
  void method(void)
  {
    std::cout << "Ej. SC_METHOD @ " << sc_time_stamp() << std::endl;
    // Trigger después de 1 seg
    next_trigger(sc_time(1, SC_SEC));
  }
  // Definición de la Función para SC_THREAD
  void thread()
  {
    // Bucle infinito
    while (true)
    {
      std::cout << "Ej. SC_THREAD @ " << sc_time_stamp() << std::endl;
      // Espera de 1 seg
      wait(1, SC_SEC);
    }
  }
  // Definición de la Función para SC_CTHREAD
  void cthread()
  {
    // Bucle infinito
    while (true)
    {
      std::cout << "Ej. SC_CTHREAD @ " << sc_time_stamp() << std::endl;
      // Espera hasta el siguiente evento clk,
      // que se ejecuta después de 1 seg.
      wait();
    }
  }
};

int sc_main(int, char *[])
{
  // Instancia del módulo
  PROCESS process("Simulación_de_Procesos");
  std::cout << "La ejecución comienza @ " 
    << sc_time_stamp() << std::endl;
  // La simulación correrá durante 2 segundos
  sc_start(2, SC_SEC);
  std::cout << "La ejecución termina @ " 
    << sc_time_stamp() << std::endl;
  return 0;
}
```
**Su salida es:**

```
La ejecución comienza @ 0 s
SC_METHOD triggered @ 0 s
SC_THREAD triggered @ 0 s
SC_CTHREAD triggered @ 0 s
SC_METHOD triggered @ 1 s
SC_THREAD triggered @ 1 s
SC_CTHREAD triggered @ 1 s
La ejecución termina @ 2 s
```

### B. Escenarios

La lógica de programación en SystemC se lo abstrae en 3 fases o escenarios:
<ol>
<li><strong>Elaboración:</strong> el objetivo es crear estructuras de datos internas de la semántica de la simulación. Esta creación abarca los módulos, puertos, canales primitivos y procesos.</li>
<li><strong>Ejecución:</strong> se puede dividir en dos etapas:
  <ol type="a">
    <li><strong>Inicialización:</strong> el kernel de simulación identifica los procesos y los etiqueta como ejecutable o en espera</li>
    <li><strong>Simulación:</strong> una máquina de estado programa la ejecución de procesos y avanza el tiempo de simulación. Este se compone de dos fases internas:
      <ol type="i"> 
      <li><strong>Evaluar:</strong> ejecuta todos los procesos uno a la vez hasta <code>wait()</code>.</li>
      <li><strong>Avance de tiempo:</strong> esta fase se ejecuta después de que el conjunto de procesos ejecutables termine, donde:
        <ol type="a">
        <li>Mueve el tiempo de simulación al tiempo más cercano con un evento programado.</li>
        <li>Mueve los procesos del estado en espera a ejecutables.</li>
        <li>Vuelve a la fase de "Evaluar"</li>
        </ol>
        El proceso continúa hasta que ocurra:
        <ol type="a">
        <li>Todos los procesos se han ejecutado</li>
        <li>Algún proceso ha ejecutado <code>sc_stop()</code></li>
        <li>Se ha alcanzado el tiempo máximo de simulación</li>
        </ol>
      </li>
      </ol>
    </li>
  </ol>
</li>
<li><strong>Limpieza:</strong> esta fase consiste en destruir objetos, librerar memoria, cerrar archivos abiertos, y otras acciones que se requerieran una vez terminada la simulación.</li>
</ol>

**Ejemplo de la Simulación por Escenarios**

```cpp
#include "systemc.h"

SC_MODULE(STAGE){
  // Elaboración
  SC_CTOR(STAGE){
    std::cout << sc_time_stamp() 
      << ": Elaboración: constructor" << std::endl;
    // Inicialización + Simulación
    SC_THREAD(thread);
  }
  // Limpieza
  ~STAGE()
  {
    std::cout << sc_time_stamp() 
      << ": Limpieza: destructor" << std::endl;
  }
  void thread()
  {
    std::cout << sc_time_stamp() 
      << ": Ejecución.inicialización" << std::endl;
    int i = 0;
    while (true)
    {
      // Avance de tiempo
      wait(1, SC_SEC);
      // Evaluación
      std::cout << sc_time_stamp() 
        << ": Ejecución.simulación" << std::endl;
      if (++i >= 2)
      {
        // Detiene la simulación después de 2 iteraciones
        sc_stop();
      }
    }
  }
  void before_end_of_elaboration()
  {
    std::cout << "Método: before end of elaboration" << std::endl;
  }
  void end_of_elaboration()
  {
    std::cout << "Método: end of elaboration" << std::endl;
  }
  void start_of_simulation()
  {
    std::cout << "Método: start of simulation" << std::endl;
  }
  void end_of_simulation()
  {
    std::cout << "Método: end of simulation" << std::endl;
  }
};

int sc_main(int, char *[])
{
  // Elaboración
  STAGE stage("Escenario");
  // Ejecución hasta sc_stop
  sc_start();
  // Limpieza
  return 0;
}
```
**Su salida es:**

```
0 s: Elaboración: constructor
Método: before end of elaboration
Método: end of elaboration
Método: start of simulation
0 s: Ejecución.inicialización
1 s: Ejecución.simulación
2 s: Ejecución.simulación

Info: /OSCI/SystemC: Simulation stopped by user.
Método: end of simulation
2 s: Limpieza: destructor
```

</details>

***

<details markdown=1>
<summary markdown="span" class="detail-title">
Eventos
</summary>

Un evento es un elemento utilizado para la sincronización de procesos. En SystemC viene definido por la clase `sc_event`. Esta, a su vez, cuenta con dos métodos:

1. **notify():** crea una notificación. Si no se le pasan argumentos, crea una notificación inmediata. Por otro lado, se le puede pasar un valor numérico y una unidad de tiempo para enviar una notificación planificada.
    
2. **cancel():** elimina cualquier notificación pendiente del evento. Se debe tener en cuenta que una notificación inmediata no puede ser cancelada.

**A continuación, un ejemplo:**
```cpp
#include "systemc.h"

SC_MODULE(EVENT)
{
  sc_event e;

  SC_CTOR(EVENT)
  {
    SC_THREAD(trigger);
    SC_THREAD(catcher);
  }

  void trigger()
  {
    while (true)
    {
      e.notify(1, SC_SEC);

      if (sc_time_stamp() == sc_time(2, SC_SEC))
      {
        e.cancel();
      }

      wait(2, SC_SEC);
    }
  }
  void catcher()
  {
    while (true)
    {
      wait(e);
      std::cout << "Evento capturado en: " 
        << sc_time_stamp() << std::endl;
    }
  }
};

int sc_main(int, char *[])
{
  EVENT event("event");
  sc_start(10, SC_SEC);

  return 0;
}
```

**Su salida es:**
```bash
  Evento capturado en: 1 s
  Evento capturado en: 5 s
  Evento capturado en: 7 s
  Evento capturado en: 9 s
```

</details>

***

<details markdown=1>
<summary markdown="span" class="detail-title">
Señal
</summary>

### Leer y Escribir (Write/Read)
Una señal simula el comportamiento de un cable físico transportando una señal electrónica digital. Los métodos importantes serían:

1. **write():** envía una solicitud de actualización, si y solo si el valor nuevo es diferente del actual. Esta actualización se verá reflejada después de un delta_cycle.
    
2. **read():** envía el valor actual de la señal sin removerlo.

**A continuación, un ejemplo sencillo:**

```cpp
#include "systemc.h"

SC_MODULE(SIGNAL)
{
  sc_signal<int> value;
  SC_CTOR(SIGNAL)
  {
    SC_THREAD(readwrite);
  }
  void readwrite()
  {
    value.write(3);
    std::cout << "Valor inicial de la señal = " << value.read() << std::endl;

    wait(SC_ZERO_TIME);
    std::cout << "Valor despues del primer delta_cycle = " << value.read() << std::endl;

    value = 42;
    std::cout << "Valor de la señal = " << value << std::endl;

    wait(SC_ZERO_TIME);
    std::cout << "Valor despues del segundo delta_cycle = " << value << std::endl;
  }
};

int sc_main(int, char *[])
{
  SIGNAL signal("signal");
  signal.value = -1;
  sc_start();
  return 0;
}
```

**Su salida es:**
```bash
  Valor inicial de la señal = -1
  Valor despues del primer delta_cycle = 3
  Valor de la señal = 3
  Valor despues del segundo delta_cycle = 42
```


</details>

***

<details markdown=1>
<summary markdown="span" class="detail-title">
Comunicación
</summary>

### A. Puerto

Existen tres conceptos claves para la comunicación:

1. **Interfaz:** es una clase abstracta derivada de `sc_interface` que contiene funciones virtuales que se definirán en uno o más canales.

1. **Puerto:** proporciona los medios para escribir o leer un módulo mediante llamadas al canal vinculado. Este se debe usar cuando se requiera llamar a una función que esté afuera o pertenezca a otro módulo. Para ello, se lo puede realizar mediante los métodos:
  ```cpp
  // Para escribir un valor al puerto
  port_name.write("value")
  // Para leer un valor desde el puerto
  port_name.read()
  ```
1. **Canal:** un canal proporciona funciones para tener comunicación entre módulos. Estos pueden ser primitivos o jerárquicos.
  - La clase `sc_prim_channel` es la base para crear canales primitivos. Estos pueden ser: `sc_mutex`, `sc_fifo` o `sc_semaphore`.

**Ejemplo de la comunicación por puertos y canales**

```cpp
#include "systemc.h"

// Definición del módulo 1
SC_MODULE(MODULE1)
{
  // Un canal dentro del módulo
  sc_signal<int> s;
  // Un puerto para escribir a un canal exterior
  sc_port<sc_signal_out_if<int>> p;
  SC_CTOR(MODULE1)
  {
    // Un proceso para escribir en un canal propio
    SC_THREAD(selfWrite);
    // Un proceso para leer desde un canal propio
    SC_THREAD(selfRead);
    // Activación por el cambio de valor en el canal
    sensitive << s;
    dont_initialize();
    // Un proceso para escribir en un canal exterior
    SC_THREAD(outsideWrite);
  }
  void selfWrite()
  {
    int val = 1;
    while (true)
    {
      // Escritura en el canal propio
      s.write(val++);
      wait(1, SC_SEC);
    }
  }
  void selfRead()
  {
    while (true)
    {
      // Lectura del canal propio
      std::cout << sc_time_stamp()
                << ": Lectura del canal propio, valor="
                << s.read() << std::endl;
      // Espera a una señal
      wait();
    }
  }
  void outsideWrite()
  {
    int val = 1;
    while (true)
    {
      // Escribe a un canal exterior,
      // llama al método de escritura exterior
      p->write(val++);
      wait(1, SC_SEC);
    }
  }
};
// Definición del módulo 2:
// lectura de un canal exterior
SC_MODULE(MODULE2)
{
  // Un puerto para leear desde un canal exterior
  sc_port<sc_signal_in_if<int>> p;
  SC_CTOR(MODULE2)
  {
    // Un proceso para leer desde un canal exterior
    SC_THREAD(outsideRead);
    // Activación por el cambio de valor en el canal
    sensitive << p;
    dont_initialize();
  }
  void outsideRead()
  {
    while (true)
    {
      // Uso del puerto para leer del canal,
      // como un puntero
      std::cout << sc_time_stamp()
                << ": Lectura del canal exterior, valor="
                << p->read() << std::endl;
      // Recibe del puerto
      wait();
    }
  }
};

int sc_main(int, char *[])
{
  // Inicialización del módulo 1
  MODULE1 module1("modulo_1");
  // Inicialización del módulo 2
  MODULE2 module2("modulo_2");
  // Declaración de un canal (señal) exterior para
  // comunicar el módulo 1 y módulo 2
  sc_signal<int> s;
  // Conecta el puerto al canal del
  // módulo 1 y módulo 2
  module1.p(s);
  module2.p(s);
  sc_start(2, SC_SEC);
  return 0;
}
```
**Su salida es:**
```
0 s: Lectura del canal propio, valor=1
0 s: Lectura del canal exterior, valor=1
1 s: Lectura del canal propio, valor=2
1 s: Lectura del canal exterior, valor=2
```

### B. Puerto a Puerto (Port 2 Port)

Pretende cubrir los siguientes casos:

- Para conectar dos procesos del mismo módulo mediante un canal:<br/>
  ```cpp
  proceso1() --> canal --> proceso2()
  ```
- Para conectar dos procesos de diferentes módulos mediante un puerto y un canal: <br/>
  ```cpp
  modulo1::proceso1() --> modelo1::puerto1 --> canal --> modelo2::puerto2 --> modulo2::proceso2()
  ```
- Para conectar dos procesos de diferentes módulos mediante `export`:
  ```cpp
  modulo1::proceso1() --> modulo1::canal --> modulo1::export1 --> modulo2::puerto2 --> modulo2::proceso2()
  ```
- También, en casos especiales, un puerto se puede conectar a otro puerto de un submódulo:
  ```cpp
  modulo::puerto1 --> modulo::submodulo::puerto2
  ```

**Ejemplo de la comunicación de puerto a puerto**

```cpp
#include "systemc.h"

// Un submódulo que escribe a un canal
SC_MODULE(SUBMODULE1)
{
  sc_port<sc_signal_out_if<int>> p;
  SC_CTOR(SUBMODULE1)
  {
    SC_THREAD(writer);
  }
  void writer()
  {
    int val = 1;
    while (true)
    {
      // Escribe a un canal mediante un puerto
      p->write(val++);
      wait(1, SC_SEC);
    }
  }
};
// Un submódulo que lee desde un canal
SC_MODULE(SUBMODULE2)
{
  sc_port<sc_signal_in_if<int>> p;
  SC_CTOR(SUBMODULE2)
  {
    SC_THREAD(reader);
    // Activación por el cambio de valor en el canal
    sensitive << p;
    dont_initialize();
  }
  void reader()
  {
    while (true)
    {
      std::cout << sc_time_stamp()
                << ": Lectura desde el canal, valor="
                << p->read() << std::endl;
      // Recibe del canal mediante un puerto
      wait();
    }
  }
};
// Módulo 1 padre
SC_MODULE(MODULE1)
{
  sc_port<sc_signal_out_if<int>> p;
  // Declaración del submódulo
  SUBMODULE1 sub1;
  // Instancia del submódulo
  SC_CTOR(MODULE1) : sub1("sub1")
  {
    // Conección del puerto del submódulo
    // al puerto del padre
    sub1.p(p);
  }
};
SC_MODULE(MODULE2)
{
  sc_port<sc_signal_in_if<int>> p;
  SUBMODULE2 sub2;
  SC_CTOR(MODULE2) : sub2("sub2")
  {
    sub2.p(p);
  }
};

int sc_main(int, char *[])
{
  MODULE1 module1("module1");
  MODULE2 module2("module2");
  // Definición del canal exterior para
  // comunicar el módulo 1 y módulo 2
  sc_signal<int> s;
  // Conección del puerto del módulo 1
  // al canal, para escritura
  module1.p(s);
  // Conección del puerto del módulo 2
  // al canal, para lectura
  module2.p(s);
  sc_start(2, SC_SEC);
  return 0;
}
```
**Su salida es:**
```
0 s: Lectura desde el canal, valor=1
1 s: Lectura desde el canal, valor=2
```
</details>

[Página Principal]({{site.baseurl}}/)